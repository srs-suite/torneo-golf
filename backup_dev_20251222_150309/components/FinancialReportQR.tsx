import { useState } from 'react';
import { QrCode, Copy, Check, Download } from 'lucide-react';
import { useParams } from 'react-router-dom';

export function FinancialReportQR() {
  const { clubId } = useParams();
  const [copied, setCopied] = useState(false);
  
  // Generate the report URL
  const reportUrl = `${window.location.origin}/club/${clubId}/informe-contable`;
  
  // Generate QR code URL using public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(reportUrl)}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownloadQR = () => {
    // Create a temporary link to download the QR code
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `informe-contable-qr-club-${clubId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <img 
              src={qrCodeUrl} 
              alt="QR Code para Informe Contable"
              className="w-64 h-64"
            />
          </div>
        </div>
        
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

