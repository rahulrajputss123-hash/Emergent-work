-- BANNERS — admin-managed promotional / smart banners shown across Home, Offers, Tasks, Offerwall.
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  banner_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  eyebrow text NOT NULL DEFAULT '',
  image_url text,
  icon text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT 'jade',
  cta_label text,
  cta_target jsonb,
  smart_key text,
  smart_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banners_section_check CHECK (section IN ('home','offers','tasks','offerwall')),
  CONSTRAINT banners_type_check CHECK (banner_type IN ('custom','smart','scheduled')),
  CONSTRAINT banners_accent_check CHECK (accent IN ('jade','gold','mint'))
);

CREATE INDEX banners_section_active_idx
  ON public.banners (section, is_active, priority DESC);

GRANT SELECT ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners readable" ON public.banners
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "banners admin write" ON public.banners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
