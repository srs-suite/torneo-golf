import { useState, useEffect } from 'react';
import { QrCode, Copy, Check, Download, AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';

export function FinancialReportQR() {
  const { clubId } = useParams();
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>(''); // Store QR as data URL
  const [loading, setLoading] = useState(true);
  
  // Get the base URL - if localhost, try to use IP for mobile access
  const getBaseUrl = () => {
    const origin = window.location.origin;
    // If using localhost, check if we can detect the local IP
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      // In development, try to use the hostname from the URL if available
      // Otherwise, keep localhost (user should access via IP manually)
      return origin;
    }
    return origin;
  };
  
  const baseUrl = getBaseUrl();
  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  
  // Generate the report URL
  const reportUrl = `${baseUrl}/club/${clubId}/informe-contable`;
  
  // Use backend endpoint to generate QR code (avoids CORS and external service issues)
  // Pass the frontend URL as query parameter so backend knows the correct URL
  const qrCodeUrl = `/api/club/${clubId}/qr-code?url=${encodeURIComponent(baseUrl)}`;
  
  // Fallback services if backend fails
  const fallbackServices = [
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(reportUrl)}`,
    `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(reportUrl)}`,
  ];
  
  const [currentQrService, setCurrentQrService] = useState(-1); // -1 means using backend
  const [useFallback, setUseFallback] = useState(false);
  
  // Try to fetch QR from backend first
  useEffect(() => {
    const fetchQrFromBackend = async () => {
      if (!clubId) return;
      
      setLoading(true);
      setQrError(false);
      
      try {
        const response = await fetch(qrCodeUrl);
        if (response.ok && response.headers.get('content-type')?.includes('image')) {
          // Convert blob to data URL
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setQrDataUrl(reader.result as string);
            setLoading(false);
          };
          reader.readAsDataURL(blob);
          return;
        } else {
          console.error('❌ Backend QR endpoint failed:', response.status, response.statusText);
          throw new Error(`Backend returned ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Error fetching QR from backend:', error);
        // Fallback will be handled by img onError
        setLoading(false);
      }
    };
    
    fetchQrFromBackend();
  }, [clubId, qrCodeUrl]);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = getQrUrl();
    link.download = `informe-contable-qr-club-${clubId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleImageError = () => {
    if (!useFallback) {
      // Backend failed, try fallback services
      setUseFallback(true);
      setCurrentQrService(0);
    } else if (currentQrService < fallbackServices.length - 1) {
      // Try next fallback service
      setCurrentQrService(currentQrService + 1);
    } else {
      // All services failed
      setQrError(true);
    }
  };
  
  // Get the current QR URL
  const getQrUrl = () => {
    if (useFallback && currentQrService >= 0) {
      return fallbackServices[currentQrService];
    }
    return qrCodeUrl;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-green-100 p-2 rounded-lg">
          <QrCode className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            QR para Informe Contable de Socios
          </h3>
          <p className="text-sm text-gray-600">
            Los socios pueden escanear este QR para acceder al informe financiero
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* QR Code Image */}
        <div className="flex justify-center py-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            {qrError ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-gray-100 rounded border-2 border-dashed border-gray-300">
                <QrCode className="w-16 h-16 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 text-center px-4">
                  No se pudo cargar el QR code.
                  <br />
                  Usa el enlace directo para compartir.
                </p>
              </div>
            ) : loading ? (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500">Cargando QR...</p>
              </div>
            ) : qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="QR Code para Informe Contable"
                className="w-64 h-64"
              />
            ) : (
              <img 
                src={getQrUrl()} 
                alt="QR Code para Informe Contable"
                className="w-64 h-64"
                onError={handleImageError}
                onLoad={() => setQrError(false)}
              />
            )}
          </div>
        </div>
        
        {/* Localhost Warning */}
        {isLocalhost && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">⚠️ Acceso desde móvil</h4>
                <p className="text-sm text-yellow-800">
                  Estás usando <code className="bg-yellow-100 px-1 rounded">localhost</code>. 
                  Para que el QR funcione desde tu teléfono, accede a esta página usando la IP local de tu computadora 
                  (ej: <code className="bg-yellow-100 px-1 rounded">http://192.168.1.24:5173</code>) en lugar de localhost.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Cómo funciona:</h4>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Los socios escanean el código QR con su celular</li>
            <li>Ingresan su número de teléfono registrado</li>
            <li>El sistema verifica que sean socios activos</li>
            <li>Pueden ver otros ingresos y gastos del club</li>
            <li>El acceso queda guardado en su dispositivo</li>
          </ol>
        </div>
        
        {/* Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enlace directo:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={reportUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Download Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleDownloadQR}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Descargar QR Code</span>
          </button>
        </div>
        
        {/* Security Note */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600">
            <strong>Seguridad:</strong> Solo socios activos con teléfono registrado en la base de datos pueden acceder. 
            El sistema verifica automáticamente la identidad mediante el número de teléfono.
          </p>
        </div>
      </div>
    </div>
  );
}

