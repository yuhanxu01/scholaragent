import React, { useState } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { userService } from '../../services/userService';
import { toast } from 'react-hot-toast';

interface FollowButtonProps {
  username: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean, followersCount?: number) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
  showIcon?: boolean;
  disabled?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  username,
  isFollowing,
  onFollowChange,
  size = 'md',
  variant = 'primary',
  showIcon = true,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);

  const handleFollowClick = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      if (isFollowing) {
        const response = await userService.unfollow(username);
        onFollowChange?.(false, response.data.followers_count);
        toast.success('取消关注成功');
      } else {
        const response = await userService.follow(username);
        onFollowChange?.(true, response.data.followers_count);
        toast.success('关注成功');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.detail || '操作失败';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return '';
    if (isFollowing) return '已关注';
    return '关注';
  };

  const getVariant = () => {
    if (variant === 'primary' && isFollowing) {
      return 'outline';
    }
    return variant;
  };

  return (
    <Button
      variant={getVariant()}
      size={size}
      onClick={handleFollowClick}
      disabled={loading || disabled}
      className="min-w-[80px]"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {showIcon && (
            <>
              {isFollowing ? (
                <UserMinus className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </>
          )}
          <span className={showIcon ? 'ml-1' : ''}>
            {getButtonText()}
          </span>
        </>
      )}
    </Button>
  );
};