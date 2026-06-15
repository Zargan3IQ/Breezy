interface AvatarProps {
  src?: string;       // Optional: because sometimes users don't have a profile pic
  alt: string;        // Required: for screen readers
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Restrict sizes to a standard design system
}

export default function Avatar({ src, alt, size = 'md' }: AvatarProps) {
  // A mapping object to translate our size prop into Tailwind classes
  const sizeClasses = {
    sm: 'w-8 h-8',    // 32px
    md: 'w-10 h-10',  // 40px (Standard for feed)
    lg: 'w-12 h-12',  // 48px
    xl: 'w-32 h-32'   // 128px (For the profile page later)
  };

  // The default image if src is missing or broken
  const defaultAvatar = "https://i.pravatar.cc/150?u=placeholder";

  return (
    <img 
      src={src || defaultAvatar} 
      alt={alt} 
      className={`${sizeClasses[size]} rounded-full object-cover bg-gray-200 shrink-0`}
      // object-cover ensures non-square images don't get stretched
      // bg-gray-200 provides a nice fallback background while the image loads
    />
  );
}