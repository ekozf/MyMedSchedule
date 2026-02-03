import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Trash2, Edit } from 'lucide-react-native';
import type { Profile } from '@/types';

export interface ProfileCardProps {
  profile: Profile;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  medicationCount?: number;
}

export function ProfileCard({
  profile,
  isActive = false,
  onPress,
  onEdit,
  onDelete,
  medicationCount = 0,
}: ProfileCardProps) {
  return (
    <Card className={isActive ? 'border-primary border-2' : ''}>
      <Pressable onPress={onPress}>
        <CardContent className="p-4">
          <View className="flex-row items-center gap-4">
            <Avatar
              uri={profile.avatarUri}
              fallback={profile.name}
              size="lg"
            />
            
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-lg font-semibold text-foreground">
                  {profile.name}
                </Text>
                {isActive && (
                  <Badge label="Active" variant="success" />
                )}
              </View>
              
              <Text className="text-sm text-muted-foreground">
                {medicationCount} {medicationCount === 1 ? 'medication' : 'medications'}
              </Text>
            </View>
            
            {isActive && (
              <Check size={24} className="text-primary" />
            )}
          </View>
          
          {(onEdit || onDelete) && (
            <View className="flex-row gap-2 mt-4">
              {onEdit && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex-row items-center gap-2 px-4 py-2 rounded-md bg-secondary flex-1"
                >
                  <Edit size={16} className="text-secondary-foreground" />
                  <Text className="text-sm font-medium text-secondary-foreground">
                    Edit
                  </Text>
                </Pressable>
              )}
              
              {onDelete && !isActive && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex-row items-center gap-2 px-4 py-2 rounded-md bg-destructive/10 flex-1"
                >
                  <Trash2 size={16} className="text-destructive" />
                  <Text className="text-sm font-medium text-destructive">
                    Delete
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </CardContent>
      </Pressable>
    </Card>
  );
}
