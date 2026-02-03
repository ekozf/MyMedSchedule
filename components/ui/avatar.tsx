import * as React from 'react';
import { View, Image, Text } from 'react-native';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  uri?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

const Avatar = React.forwardRef<View, AvatarProps>(
  ({ uri, fallback, size = 'md', className }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    
    const initials = React.useMemo(() => {
      if (!fallback) return '?';
      return fallback
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }, [fallback]);
    
    return (
      <View
        ref={ref}
        className={cn(
          'rounded-full bg-muted items-center justify-center overflow-hidden',
          sizeClasses[size],
          className
        )}
      >
        {uri && !imageError ? (
          <Image
            source={{ uri }}
            className="w-full h-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <Text className={cn('font-semibold text-muted-foreground', textSizeClasses[size])}>
            {initials}
          </Text>
        )}
      </View>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
