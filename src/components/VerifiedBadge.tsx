import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { G } from '@/constants/tokens';

interface Props {
  size?: number;
}

/**
 * YRDLY verified checkmark badge.
 * Render next to any verified user name or business name.
 *
 * Usage:
 *   {user.verified && <VerifiedBadge size={16} />}
 */
export function VerifiedBadge({ size = 20 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"
        fill={G}
      />
    </Svg>
  );
}
