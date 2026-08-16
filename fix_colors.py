import os
import re

# We will apply safe regex replacements to src/app and src/components
import glob

# For replacing #FFF, #FFFFFF, white with theme.colors.DARK (on buttons with G) or TEXT_PRIMARY etc.
# Actually, since it's hard to guess the context for every single color string, we will manually
# craft a sed-like script for the lines we found.

files_to_fix = [
  "src/app/settings/payouts.tsx",
  "src/app/settings/safety.tsx",
  "src/app/businesses/catalog/[itemId].tsx",
  "src/app/chat/[id].tsx",
  "src/app/alert/[id].tsx",
  "src/app/(tabs)/catalog.tsx",
  "src/app/alerts.tsx",
  "src/app/marketplace/[id].tsx",
  "src/app/verify-phone.tsx",
  "src/app/my-events.tsx",
  "src/app/transactions/[id]/index.tsx",
  "src/app/(onboarding)/welcome.tsx",
  "src/app/events/[id]/index.tsx",
  "src/app/events/[id]/manage.tsx",
  "src/app/events/scan.tsx",
  "src/app/(admin)/disputes/[id].tsx",
  "src/app/(admin)/create-alert.tsx",
  "src/components/GlassCard.tsx",
  "src/components/ProfilePostGridItem.tsx",
  "src/components/OfflineBanner.tsx",
  "src/components/DateTimePickerModal.tsx",
  "src/components/CommentsBottomSheet.tsx",
  "src/components/EventList.tsx",
  "src/components/AlertBanner.tsx",
  "src/components/onboarding/primitives.tsx",
  "src/components/EventCard.tsx",
  "src/components/SvgIcons.tsx",
  "src/components/ErrorBoundary.tsx",
]

def replace_in_file(path, replacements):
    try:
        with open(path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        return
    for r in replacements:
        content = content.replace(r[0], r[1])
    with open(path, 'w') as f:
        f.write(content)


replace_in_file("src/app/settings/payouts.tsx", [('color="#000"', 'color={theme.colors.TEXT_PRIMARY}')])
replace_in_file("src/app/settings/safety.tsx", [("color: '#000'", "color: theme.colors.DARK")])

replace_in_file("src/app/businesses/catalog/[itemId].tsx", [
    ("color={isDarkMode ? '#fff' : '#000'}", "color={theme.colors.TEXT_PRIMARY}"),
    ('color="#000000"', 'color={theme.colors.TEXT_PRIMARY}')
])

replace_in_file("src/app/chat/[id].tsx", [
    ("color: isMine ? '#000' : theme.colors.TEXT_PRIMARY", "color: isMine ? theme.colors.DARK : theme.colors.TEXT_PRIMARY"),
    ("color={item.is_read ? '#000' : 'rgba(0,0,0,0.4)'}", "color={item.is_read ? theme.colors.TEXT_PRIMARY : theme.colors.LABEL}")
])

replace_in_file("src/app/alert/[id].tsx", [
    ("color: isResolved ? theme.colors.MUTED : '#FFF'", "color: isResolved ? theme.colors.MUTED : theme.colors.TEXT_PRIMARY"),
    ("color: 'rgba(255,255,255,0.8)'", "color: theme.colors.TEXT_SECONDARY")
])

replace_in_file("src/app/(tabs)/catalog.tsx", [
    ("color: '#000'", "color: theme.colors.DARK")
])

replace_in_file("src/app/alerts.tsx", [
    ("color: '#FFF'", "color: theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/app/marketplace/[id].tsx", [
    ("color={isBookmarked ? theme.colors.G : '#FFF'}", "color={isBookmarked ? theme.colors.G : theme.colors.TEXT_PRIMARY}")
])

replace_in_file("src/app/verify-phone.tsx", [
    ('color="#000"', 'color={theme.colors.TEXT_PRIMARY}')
])

replace_in_file("src/app/my-events.tsx", [
    ('color="#000"', 'color={theme.colors.TEXT_PRIMARY}')
])

replace_in_file("src/app/transactions/[id]/index.tsx", [
    ("color: isDarkMode ? '#FFB74D' : '#E65100'", "color: theme.colors.WARNING"),
    ("bg: isDarkMode ? '#3E2723' : '#FFF3E0'", "bg: theme.colors.SURFACE")
])

replace_in_file("src/app/(onboarding)/welcome.tsx", [
    ("color: '#FFFFFF'", "color: theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/app/events/[id]/index.tsx", [
    ("color={isBookmarked ? theme.colors.G : \"#FFF\"}", "color={isBookmarked ? theme.colors.G : theme.colors.TEXT_PRIMARY}"),
    ("backgroundColor: idx === currentImageIndex ? '#FFF' : 'rgba(255,255,255,0.5)'", "backgroundColor: idx === currentImageIndex ? theme.colors.TEXT_PRIMARY : theme.colors.LABEL"),
    ('color="#000"', 'color={theme.colors.DARK}'),
    ("color: isFollowingOrganizer ? theme.colors.TEXT_PRIMARY : '#FFF'", "color: isFollowingOrganizer ? theme.colors.TEXT_PRIMARY : theme.colors.DARK"),
    ("color: isOwner ? theme.colors.TEXT_PRIMARY : (isExpired || allTicketsSoldOut ? theme.colors.MUTED : '#FFF')", "color: isOwner ? theme.colors.TEXT_PRIMARY : (isExpired || allTicketsSoldOut ? theme.colors.MUTED : theme.colors.DARK)")
])

replace_in_file("src/app/events/[id]/manage.tsx", [
    ('color="#000"', 'color={theme.colors.DARK}')
])

replace_in_file("src/app/events/scan.tsx", [
    ('color="#000"', 'color={theme.colors.DARK}')
])

replace_in_file("src/app/(admin)/disputes/[id].tsx", [
    ('color="#000"', 'color={theme.colors.TEXT_PRIMARY}')
])

replace_in_file("src/app/(admin)/create-alert.tsx", [
    ("color: '#111827'", "color: theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/components/GlassCard.tsx", [
    ("shadowColor: '#000'", "shadowColor: theme.colors.DARK")
])

replace_in_file("src/components/ProfilePostGridItem.tsx", [
    ("color: '#FFFFFF'", "color: theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/components/OfflineBanner.tsx", [
    ("shadowColor: '#000'", "shadowColor: theme.colors.DARK"),
    ("color: '#FFFFFF'", "color: theme.colors.DARK")
])

replace_in_file("src/components/DateTimePickerModal.tsx", [
    ("color: '#FFFFFF'", "color: theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/components/EventList.tsx", [
    ("color: '#FFF'", "color: theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/components/AlertBanner.tsx", [
    ("color: isResolved ? theme.colors.MUTED : '#FFF'", "color: isResolved ? theme.colors.MUTED : theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/components/onboarding/primitives.tsx", [
    ("color: '#FFFFFF'", "color: theme.colors.DARK")
])

replace_in_file("src/components/EventCard.tsx", [
    ("color: '#FFF'", "color: theme.colors.TEXT_PRIMARY")
])

replace_in_file("src/components/ErrorBoundary.tsx", [
    ("color: '#FFFFFF'", "color: theme.colors.DARK"),
    ("color: '#000'", "color: theme.colors.DARK")
])

replace_in_file("src/components/SvgIcons.tsx", [
    ("color = '#000'", "color = 'currentColor'")
])

