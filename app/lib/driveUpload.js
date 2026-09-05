import { getGoogleDrive } from './sheets'
import { Readable } from 'stream'

const PAYMENT_UPLOADS_FOLDER_ID = process.env.PAYMENT_UPLOADS_FOLDER_ID

// Uploads a file buffer to the designated Drive folder, makes it viewable by
// anyone with the link (needed so it can be displayed as a thumbnail and
// read by OCR the same way Messenger-sourced screenshots already are), and
// returns a direct-viewable URL.
export async function uploadPaymentScreenshot(buffer, filename, mimeType) {
  if (!PAYMENT_UPLOADS_FOLDER_ID) throw new Error('PAYMENT_UPLOADS_FOLDER_ID not configured')
  const drive = getGoogleDrive()

  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const file = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [PAYMENT_UPLOADS_FOLDER_ID]
    },
    media: {
      mimeType,
      body: stream
    },
    fields: 'id'
  })

  const fileId = file.data.id

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' }
  })

  // A direct-content URL — works for <img> display and for OCR/Tesseract to fetch bytes.
  const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`

  return { fileId, imageUrl }
}