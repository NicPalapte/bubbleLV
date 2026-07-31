export interface PackageColors { color: string; soft: string; mid: string; border: string; ink: string }
export interface Package extends PackageColors { id: string; code: string; name: string; hue: number }
export function PackageTag(props: { pkg: Package }): JSX.Element;
export function PackageDots(props: { pkgs: Package[]; max?: number }): JSX.Element | null;
/** All categorical colors come from here — same L and C, hue varies only. */
export function packageColors(hue: number): PackageColors;
