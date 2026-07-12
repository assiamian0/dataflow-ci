import { Resend } from 'resend'
import { env } from '../config/env'

// Le client Resend n'est instancié que si une clé API est configurée.
// Sans clé, les notifications sont simplement désactivées (silencieusement),
// pour ne jamais bloquer le traitement d'un fichier à cause d'un envoi d'email.
const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null

interface UploadCompletedEmailParams {
  to: string
  originalName: string
  sourceName: string
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  totalLines: number
  validLines: number
  invalidLines: number
  uploadId: string
}

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: 'validé avec succès',
  PARTIAL: 'partiellement validé',
  FAILED: 'échoué',
}

export async function sendUploadCompletedEmail(params: UploadCompletedEmailParams) {
  if (!resend) {
    console.log('ℹ️  Notifications désactivées (RESEND_API_KEY non configurée) — email non envoyé')
    return
  }

  const detailUrl = `${env.frontendUrls[0]}/uploads/${params.uploadId}`
  const statusLabel = STATUS_LABELS[params.status] ?? params.status

  try {
    await resend.emails.send({
      from: env.resendFromEmail,
      to: params.to,
      subject: `DataFlow CI — Ton fichier ${params.originalName} a été ${statusLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0f172a;">Traitement terminé</h2>
          <p>Le fichier <strong>${params.originalName}</strong> déposé sur la source
          <strong>${params.sourceName}</strong> a été ${statusLabel}.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; color: #64748b;">Lignes totales</td>
              <td style="padding: 8px; text-align: right;">${params.totalLines}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #64748b;">Lignes valides</td>
              <td style="padding: 8px; text-align: right; color: #16a34a;">${params.validLines}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #64748b;">Lignes invalides</td>
              <td style="padding: 8px; text-align: right; color: #dc2626;">${params.invalidLines}</td>
            </tr>
          </table>
          <a href="${detailUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 16px; border-radius: 6px; text-decoration: none;">
            Voir le détail
          </a>
        </div>
      `,
    })
    console.log(`✅ Email de notification envoyé à ${params.to}`)
  } catch (err) {
    // Une erreur d'envoi d'email ne doit jamais faire échouer le traitement du fichier.
    console.error("❌ Échec de l'envoi de l'email de notification :", err)
  }
}
