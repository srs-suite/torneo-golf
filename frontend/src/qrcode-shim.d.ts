declare module 'qrcode' {
  interface ToDataUrlOptions {
    width?: number
    margin?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  }
  const QRCode: {
    toDataURL(text: string, options?: ToDataUrlOptions): Promise<string>
  }
  export default QRCode
}
