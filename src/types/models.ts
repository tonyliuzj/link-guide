export type UserRole = 'admin' | 'user';
export type LinkMode = 'simple' | 'custom_page' | 'password';

export type User = {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  session_valid_after: number;
  email_verified: number;
  created_at: string;
};

export type UserListItem = Pick<User, 'id' | 'email' | 'role' | 'created_at'>;

export type Domain = {
  id: number;
  domain: string;
  base_path: string;
  is_active: number;
  allow_guest_create: number;
  turnstile_site_key: string | null;
  turnstile_secret_key: string | null;
  base_response: string;
  base_redirect_url: string | null;
  created_at: string;
};

export type Link = {
  id: number;
  short_code: string;
  destination_url: string;
  domain_id: number;
  user_id: number;
  mode: LinkMode;
  password_hash: string | null;
  custom_page_config: string | null;
  stats_enabled: number;
  turnstile_enabled: number;
  redirect_delay: number;
  allow_skip: number;
  created_at: string;
  expires_at: string | null;
};

export type BlacklistItem = {
  id: number;
  path: string;
  reason: string | null;
  created_at: string;
};

export type SiteSettings = {
  site_title: string;
  site_domain: string;
  turnstile_site_key?: string;
  turnstile_secret_key?: string;
  turnstile_landing_create: number;
  turnstile_login: number;
  turnstile_signup: number;
  stats_retention_days: number;
};
