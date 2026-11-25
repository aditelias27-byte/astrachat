import { getSiteSettings } from '@/lib/ai/server-helpers'

export async function GET() {
  const s = await getSiteSettings()
  return Response.json({
    settings: s
      ? {
          site_name: s.site_name,
          site_logo: s.site_logo,
          welcome_message: s.welcome_message,
          maintenance_mode: s.maintenance_mode,
          registration_enabled: s.registration_enabled,
          primary_color: s.primary_color,
          landing_text: s.landing_text,
          footer_text: s.footer_text,
        }
      : null,
  })
}
