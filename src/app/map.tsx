import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Animated,
  PanResponder, FlatList, Dimensions, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/use-supabase-auth';
import Supercluster from 'supercluster';

const { width, height } = Dimensions.get('window');
const SHEET_H = height * 0.62;
const PEEK = 110;

type FilterType = 'all' | 'friends' | 'businesses' | 'events';
type MapMarker = { id: string; type: 'friend'|'business'|'event'; lat: number; lng: number; title: string; subtitle?: string; targetId: string; avatar_url?: string };
type ActivityItem = { id: string; kind: 'post'|'market'|'event'|'biz'; title: string; subtitle: string; image?: string; time: string; meta?: string; route: string; lat?: number; lng?: number; };

const FILTERS: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'all', label: 'All', icon: 'apps', color: '#82DB7E' },
  { key: 'friends', label: 'Friends', icon: 'people', color: '#8B5CF6' },
  { key: 'businesses', label: 'Businesses', icon: 'storefront', color: '#22c55e' },
  { key: 'events', label: 'Events', icon: 'calendar', color: '#F59E0B' },
];

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2236' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d1a0f' }] },
];

function formatTimeOrDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 0) {
    // Future date (e.g. event start time)
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getDistanceStr(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const km = R * c;
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
}

function FriendMarker({ avatar_url }: { avatar_url?: string }) {
  return (
    <View style={ms.fMarker}>
      <View style={ms.fRing}>
        {avatar_url
          ? <Image source={{ uri: avatar_url }} style={ms.fAvatar} />
          : <View style={ms.fFallback}><Ionicons name="person" size={16} color="#fff" /></View>}
      </View>
      <View style={[ms.dot, { backgroundColor: '#8B5CF6' }]} />
    </View>
  );
}

function IconMarker({ icon, color, bg }: { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }) {
  return (
    <View style={ms.iMarker}>
      <View style={[ms.iBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={[ms.dot, { backgroundColor: color }]} />
    </View>
  );
}

function ClusterBubble({ count }: { count: number }) {
  return (
    <View style={ms.cluster}>
      <Text style={ms.clusterTxt}>{count}</Text>
    </View>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppTheme();
  const router = useRouter();
  const { user, profile } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [loc, setLoc] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [allMarkers, setAllMarkers] = useState<MapMarker[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const sc = useMemo(() => new Supercluster({ radius: 50, maxZoom: 16 }), []);
  const panY = useRef(new Animated.Value(SHEET_H - PEEK)).current;
  const lastY = useRef(SHEET_H - PEEK);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
    onPanResponderMove: (_, g) => {
      panY.setValue(Math.max(0, Math.min(SHEET_H - PEEK, lastY.current + g.dy)));
    },
    onPanResponderRelease: (_, g) => {
      const cur = lastY.current + g.dy;
      const snap = g.vy < -0.5 || cur < SHEET_H * 0.35 ? 0
        : g.vy > 0.5 || cur > SHEET_H * 0.65 ? SHEET_H - PEEK
        : SHEET_H * 0.42;
      lastY.current = snap;
      Animated.spring(panY, { toValue: snap, useNativeDriver: true, tension: 65, friction: 12 }).start();
    },
  }), []);

  const getDirections = (lat: number, lng: number, label?: string) => {
    const url = Platform.OS === 'ios' ? `maps://?daddr=${lat},${lng}&dirflg=d` : `google.navigation:q=${lat},${lng}`;
    const fb = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.canOpenURL(url).then(ok => Linking.openURL(ok ? url : fb));
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLoading(false); return; }
      const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLoc(l);
      setRegion({ latitude: l.coords.latitude, longitude: l.coords.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });
      await Promise.all([fetchMarkers(), fetchActivity()]);
    })();
  }, [user]);

  const fetchMarkers = async () => {
    const found: MapMarker[] = [];
    if (user?.id) {
      const { data: frds } = await supabase.rpc('get_friends_locations', { user_id: user.id });
      (frds || []).forEach((f: any) => {
        const lat = parseFloat(f.location?.lat ?? f.location?.geopoint?.latitude);
        const lng = parseFloat(f.location?.lng ?? f.location?.geopoint?.longitude);
        if (!isNaN(lat) && !isNaN(lng)) found.push({ id: `friend-${f.friend_id}`, type: 'friend', lat, lng, title: f.friend_name, subtitle: 'Friend', targetId: f.friend_id, avatar_url: f.friend_avatar_url });
      });
    }
    const { data: bizs } = await supabase.from('businesses').select('id,name,category,location').not('location','is',null).limit(50);
    (bizs || []).forEach((b: any) => {
      const lat = parseFloat(b.location?.lat ?? b.location?.geopoint?.latitude);
      const lng = parseFloat(b.location?.lng ?? b.location?.geopoint?.longitude);
      if (!isNaN(lat) && !isNaN(lng)) found.push({ id: `biz-${b.id}`, type: 'business', lat, lng, title: b.name, subtitle: b.category, targetId: b.id });
    });
    const { data: evts } = await supabase.from('events').select('id,title,lat,lng,location_address').eq('status','PUBLISHED').not('lat','is',null).not('lng','is',null).limit(50);
    (evts || []).forEach((e: any) => {
      const lat = parseFloat(e.lat); const lng = parseFloat(e.lng);
      if (!isNaN(lat) && !isNaN(lng)) found.push({ id: `evt-${e.id}`, type: 'event', lat, lng, title: e.title || 'Event', subtitle: e.location_address, targetId: e.id });
    });
    setAllMarkers(found);
    setLoading(false);
  };

  const fetchActivity = async () => {
    const items: ActivityItem[] = [];
    const state = (profile?.location as any)?.state;
    const [{ data: posts }, { data: mkt }, { data: evts }, { data: bizs }] = await Promise.all([
      supabase.from('posts').select('id,title,content,created_at,users!posts_user_id_fkey(name,avatar_url)').not('category','in','("For Sale","Event")').order('created_at',{ascending:false}).limit(3),
      supabase.from('posts').select('id,title,price,created_at,images').eq('category','For Sale').or('is_sold.eq.false,is_sold.is.null').order('created_at',{ascending:false}).limit(2),
      supabase.from('events').select('id,title,start_time,location_address,attendee_count,cover_image_url,lat,lng').eq('status','PUBLISHED').gte('start_time',new Date().toISOString()).order('start_time',{ascending:true}).limit(3),
      supabase.from('businesses').select('id,name,category,description,image_urls,created_at,location').order('created_at',{ascending:false}).limit(2),
    ]);
    (posts||[]).forEach((p:any) => items.push({ id:`p-${p.id}`, kind:'post', title:`${p.users?.name||'Someone'} posted nearby`, subtitle: (p.content||p.title||'').slice(0,80), time: formatTimeOrDate(p.created_at), image: p.users?.avatar_url, route:`/posts/${p.id}` }));
    (mkt||[]).forEach((p:any) => items.push({ id:`m-${p.id}`, kind:'market', title: p.title, subtitle:'For sale', meta: p.price ? `₦${Number(p.price).toLocaleString()}` : '', time: formatTimeOrDate(p.created_at), image: p.images?.[0], route:`/marketplace/${p.id}` }));
    (evts||[]).forEach((e:any) => items.push({ id:`e-${e.id}`, kind:'event', title: e.title, subtitle:`${e.location_address||''}`, meta: e.attendee_count ? `${e.attendee_count} going` : '', time: formatTimeOrDate(e.start_time), image: e.cover_image_url, route:`/events/${e.id}`, lat: parseFloat(e.lat), lng: parseFloat(e.lng) }));
    (bizs||[]).forEach((b:any) => items.push({ id:`b-${b.id}`, kind:'biz', title:`${b.name}`, subtitle: b.description?.slice(0,60)||b.category||'', time: formatTimeOrDate(b.created_at), image: b.image_urls?.[0], route:`/business/${b.id}`, lat: parseFloat(b.location?.lat ?? b.location?.geopoint?.latitude), lng: parseFloat(b.location?.lng ?? b.location?.geopoint?.longitude) }));
    items.sort(() => Math.random() - 0.5);
    setActivity(items.slice(0,8));
  };

  const visibleMarkers = useMemo(() => {
    const byFilter = filter === 'all' ? allMarkers : allMarkers.filter(m => {
      if (filter === 'friends') return m.type === 'friend';
      if (filter === 'businesses') return m.type === 'business';
      if (filter === 'events') return m.type === 'event';
      return true;
    });
    if (!search.trim()) return byFilter;
    const q = search.toLowerCase();
    return byFilter.filter(m => m.title.toLowerCase().includes(q) || (m.subtitle||'').toLowerCase().includes(q));
  }, [allMarkers, filter, search]);

  useEffect(() => {
    sc.load(visibleMarkers.map(m => ({ type:'Feature' as const, properties:{ cluster:false, ...m }, geometry:{ type:'Point' as const, coordinates:[m.lng, m.lat] } })));
  }, [visibleMarkers, sc]);

  const clusters = useMemo(() => {
    if (!region) return [];
    const { latitude:lat, longitude:lng, latitudeDelta:ld, longitudeDelta:lnd } = region;
    const z = Math.min(Math.max(Math.round(Math.log(360/ld)/Math.LN2),0),20);
    return sc.getClusters([lng-lnd/2, lat-ld/2, lng+lnd/2, lat+ld/2], z);
  }, [region, sc, visibleMarkers]);

  const areaName = (profile?.location as any)?.lga || (profile?.location as any)?.state || 'Your Area';
  const bizCount = allMarkers.filter(m => m.type === 'business').length;
  const evtCount = allMarkers.filter(m => m.type === 'event').length;

  const locateMe = () => {
    if (!loc) return;
    mapRef.current?.animateToRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
  };

  if (loading) return (
    <View style={[s.fill, { backgroundColor: '#0B0D0B', justifyContent:'center', alignItems:'center' }]}>
      <ActivityIndicator size="large" color="#82DB7E" />
      <Text style={{ color:'#82DB7E', marginTop:12, fontWeight:'600' }}>Locating you...</Text>
    </View>
  );

  return (
    <View style={s.fill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region || { latitude:6.5244, longitude:3.3792, latitudeDelta:0.0922, longitudeDelta:0.0421 }}
        showsUserLocation showsMyLocationButton={false} showsBuildings pitchEnabled
        customMapStyle={Platform.OS === 'android' ? DARK_STYLE : undefined}
        onRegionChangeComplete={setRegion}
      >
        {clusters.map((c, i) => {
          const [lng, lat] = c.geometry.coordinates;
          const { cluster: isC, point_count, ...p } = c.properties as any;
          if (isC) return (
            <Marker key={`cl-${c.id??i}`} coordinate={{ latitude:lat, longitude:lng }}
              onPress={() => { const z = sc.getClusterExpansionZoom(c.id as number); const d = 360/Math.pow(2,z); mapRef.current?.animateToRegion({ latitude:lat, longitude:lng, latitudeDelta:d, longitudeDelta:d }, 400); }}>
              <ClusterBubble count={point_count} />
            </Marker>
          );
          const m = p as MapMarker;
          return (
            <Marker key={m.id} coordinate={{ latitude:m.lat, longitude:m.lng }} tracksViewChanges={false}
              onPress={() => m.type==='friend' ? router.push(`/profile/${m.targetId}`) : m.type==='event' ? router.push(`/events/${m.targetId}`) : null}>
              {m.type==='friend' ? <FriendMarker avatar_url={m.avatar_url} />
                : m.type==='business' ? <IconMarker icon="storefront-outline" color="#22c55e" bg="rgba(34,197,94,0.15)" />
                : <IconMarker icon="calendar-outline" color="#F59E0B" bg="rgba(245,158,11,0.15)" />}
            </Marker>
          );
        })}
      </MapView>

      {/* ── Top overlays ── */}
      <View style={[s.topWrap, { paddingTop: insets.top + 8 }]}>
        <View style={s.searchRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={s.searchBox}>
            <Feather name="search" size={16} color="#8a9bb0" style={{ marginRight:8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search streets, estates, businesses..."
              placeholderTextColor="#8a9bb0"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={s.nearBtn} onPress={locateMe}>
            <Ionicons name="location" size={14} color="#82DB7E" style={{ marginRight:4 }} />
            <Text style={s.nearTxt}>Near Me</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={FILTERS} keyExtractor={f => f.key}
          contentContainerStyle={{ paddingHorizontal:16, gap:8, paddingTop:10 }}
          renderItem={({ item:f }) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                style={[s.chip, active && { backgroundColor: f.color }]}
                onPress={() => setFilter(f.key)}>
                <Ionicons name={f.icon} size={14} color={active ? '#0B0D0B' : f.color} style={{ marginRight:5 }} />
                <Text style={[s.chipTxt, { color: active ? '#0B0D0B' : '#ccc' }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Estate card ── */}
      <View style={[s.estateCard, { bottom: PEEK + 24 }]}>
        <View style={s.estateRow}>
          <Ionicons name="location" size={14} color="#82DB7E" />
          <Text style={s.estateName}>{areaName}</Text>
        </View>
        <Text style={s.estateMeta}>{bizCount} businesses  •  {evtCount} events nearby</Text>
        <TouchableOpacity style={s.communityBtn} onPress={() => router.push('/community' as any)}>
          <Text style={s.communityTxt}>View Community</Text>
          <Ionicons name="chevron-forward" size={14} color="#0B0D0B" />
        </TouchableOpacity>
      </View>

      {/* ── FABs ── */}
      <View style={[s.fabs, { bottom: PEEK + 24 }]}>
        <TouchableOpacity style={s.fab} onPress={locateMe}>
          <Ionicons name="locate" size={18} color="#222" />
          <Text style={s.fabTxt}>Locate me</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.fab, s.fabGreen]} onPress={() => router.push('/create' as any)}>
          <Ionicons name="add" size={20} color="#0B0D0B" />
          <Text style={[s.fabTxt, { color:'#0B0D0B' }]}>Create Post</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.fab} onPress={() => loc && getDirections(loc.coords.latitude, loc.coords.longitude)}>
          <Ionicons name="navigate" size={18} color="#222" />
          <Text style={s.fabTxt}>Directions</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom Sheet ── */}
      <Animated.View style={[s.sheet, { transform:[{ translateY: panY }] }]}>
        <View style={s.sheetHandle} {...panResponder.panHandlers}>
          <View style={s.handleBar} />
          <View style={s.sheetTitleRow}>
            <Text style={s.sheetTitle}>Nearby Activity</Text>
            <TouchableOpacity onPress={() => router.push('/' as any)}>
              <Text style={s.seeAll}>See all  ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={activity} keyExtractor={a => a.id}
          scrollEnabled showsVerticalScrollIndicator={false}
          style={{ flex:1 }}
          renderItem={({ item:a }) => {
            let distStr = '';
            if (loc && a.lat && a.lng && !isNaN(a.lat) && !isNaN(a.lng)) {
              distStr = getDistanceStr(loc.coords.latitude, loc.coords.longitude, a.lat, a.lng);
            }
            return (
              <TouchableOpacity style={s.actRow} onPress={() => router.push(a.route as any)}>
                <View style={[s.actImg, { backgroundColor: a.kind==='event'?'rgba(245,158,11,0.15)':a.kind==='biz'?'rgba(34,197,94,0.15)':'rgba(130,219,126,0.1)' }]}>
                  {a.image
                    ? <Image source={{ uri:a.image }} style={s.actImgInner} contentFit="cover" />
                    : <Ionicons name={a.kind==='event'?'calendar-outline':a.kind==='market'?'bag-outline':a.kind==='biz'?'storefront-outline':'person-circle-outline'} size={24} color={a.kind==='event'?'#F59E0B':a.kind==='biz'?'#22c55e':'#82DB7E'} />}
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.actTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={s.actSub} numberOfLines={1}>{a.subtitle}</Text>
                  {distStr ? <Text style={s.actDist}>{distStr}</Text> : null}
                </View>
                <View style={{ alignItems:'flex-end' }}>
                  <Text style={s.actTime}>{a.time}</Text>
                  {a.meta ? <Text style={[s.actMeta, { color: a.kind==='market'?'#82DB7E':'#8B5CF6' }]}>{a.meta}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex:1, backgroundColor:'#0B0D0B' },
  topWrap: { position:'absolute', top:0, left:0, right:0 },
  searchRow: { flexDirection:'row', paddingHorizontal:16, gap:10 },
  searchBox: { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'rgba(13,17,23,0.92)', borderRadius:28, paddingHorizontal:14, height:46, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  searchInput: { flex:1, color:'#fff', fontSize:14 },
  backBtn: { width:46, height:46, borderRadius:23, backgroundColor:'rgba(13,17,23,0.92)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  nearBtn: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(13,17,23,0.92)', borderRadius:28, paddingHorizontal:14, height:46, borderWidth:1, borderColor:'rgba(130,219,126,0.3)' },
  nearTxt: { color:'#82DB7E', fontWeight:'700', fontSize:13 },
  chip: { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:'rgba(13,17,23,0.88)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  chipTxt: { fontSize:13, fontWeight:'600' },
  estateCard: { position:'absolute', left:16, width:220, backgroundColor:'rgba(13,17,23,0.94)', borderRadius:20, padding:14, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  estateRow: { flexDirection:'row', alignItems:'center', gap:4, marginBottom:4 },
  estateName: { color:'#fff', fontWeight:'800', fontSize:15 },
  estateMeta: { color:'#8a9bb0', fontSize:11, marginBottom:10 },
  communityBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#82DB7E', borderRadius:12, paddingVertical:8, gap:4 },
  communityTxt: { color:'#0B0D0B', fontWeight:'800', fontSize:13 },
  fabs: { position:'absolute', right:16, gap:10 },
  fab: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(13,17,23,0.94)', borderRadius:28, paddingHorizontal:14, paddingVertical:10, gap:6, borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  fabGreen: { backgroundColor:'#82DB7E', borderColor:'#82DB7E' },
  fabTxt: { color:'#ccc', fontWeight:'700', fontSize:13 },
  sheet: { position:'absolute', bottom:0, left:0, right:0, height:SHEET_H, backgroundColor:'#0f1410', borderTopLeftRadius:28, borderTopRightRadius:28, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  sheetHandle: { paddingTop:10, paddingHorizontal:16, paddingBottom:4 },
  handleBar: { width:40, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.2)', alignSelf:'center', marginBottom:12 },
  sheetTitleRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 },
  sheetTitle: { color:'#fff', fontWeight:'800', fontSize:17 },
  seeAll: { color:'#82DB7E', fontWeight:'700', fontSize:13 },
  actRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, gap:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' },
  actImg: { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center', overflow:'hidden' },
  actImgInner: { width:48, height:48 },
  actTitle: { color:'#fff', fontWeight:'700', fontSize:14, marginBottom:2 },
  actSub: { color:'#8a9bb0', fontSize:12 },
  actDist: { color:'#82DB7E', fontSize:11, marginTop:2, fontWeight:'500' },
  actTime: { color:'#8a9bb0', fontSize:11 },
  actMeta: { fontSize:13, fontWeight:'700', marginTop:2 },
});

const ms = StyleSheet.create({
  fMarker: { alignItems:'center' },
  fRing: { width:44, height:44, borderRadius:22, borderWidth:2.5, borderColor:'#8B5CF6', overflow:'hidden', backgroundColor:'#1a1a2e' },
  fAvatar: { width:40, height:40, borderRadius:20 },
  fFallback: { flex:1, alignItems:'center', justifyContent:'center' },
  iMarker: { alignItems:'center' },
  iBox: { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  dot: { width:8, height:8, borderRadius:4, marginTop:2 },
  cluster: { width:44, height:44, borderRadius:22, backgroundColor:'#82DB7E', alignItems:'center', justifyContent:'center', borderWidth:3, borderColor:'#fff' },
  clusterTxt: { color:'#0B0D0B', fontWeight:'900', fontSize:15 },
});
