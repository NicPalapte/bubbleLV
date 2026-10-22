export interface Member { id: string; name: string; role: string; color: string }
export interface MemberAvatarProps {
  member: Member;
  /** 16 in rows, 22 default, 30 in the topbar. */
  size?: number;
  showName?: boolean;
  onClick?: () => void;
}
export function MemberAvatar(props: MemberAvatarProps): JSX.Element;
