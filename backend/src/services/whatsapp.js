// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Formatear precios en formato argentino
const formatPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '$0';
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
};

// Formatear precios en USD
const formatPriceUSD = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return 'US$0';
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
};

// Texto del método de pago
const getPaymentMethodText = (method) => {
  switch (method?.toLowerCase()) {
    case 'efectivo': return 'Efectivo';
    case 'transferencia': return 'Transferencia';
    case 'tarjeta': return 'Tarjeta';
    case 'cheque': return 'Cheque';
    case 'otro': return 'Otro';
    default: return method || 'No especificado';
  }
};

// Formatear fecha
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// ============================================
// GENERADOR DE MENSAJE WHATSAPP - COMPROBANTE
// ============================================

function generatePaymentReceiptMessage(clubName, memberName, payment) {
  const fecha = formatDate(payment.income_date);
  const monto = payment.currency === 'USD' 
    ? formatPriceUSD(payment.amount)
    : formatPrice(payment.amount);

  const message = `*${clubName}*

Hola *${memberName}*,

Te enviamos el comprobante de tu pago:

*Recibo #${payment.income_id}*
*Fecha:* ${fecha}

*Concepto:* ${payment.description || 'Pago general'}

*Monto:* ${monto}

*Método de pago:* ${getPaymentMethodText(payment.payment_type)}

Gracias por tu contribución.

Atentamente,
*${clubName}*`;

  return message;
}

// ============================================
// GENERADOR DE URL DE WHATSAPP
// ============================================

function generateWhatsAppUrl(phone, message) {
  try {
    // Limpiar el número de teléfono (solo dígitos)
    let cleanPhone = phone.replace(/[^\d]/g, '');
    
    // Remover el 0 inicial si existe (formato local argentino/otros)
    if (cleanPhone.startsWith('0') && cleanPhone.length > 10) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // PRIORIDAD 1: Si tiene código de país 54 (Argentina)
    if (cleanPhone.startsWith('54')) {
      // Si no tiene el 9 después del 54, agregarlo
      if (!cleanPhone.startsWith('549')) {
        cleanPhone = '549' + cleanPhone.substring(2);
      }
    }
    // PRIORIDAD 2: Si tiene 11 dígitos y empieza con 1, es USA/Canadá
    else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      // Verificar que NO sea un celular argentino mal formado
      // Los celulares argentinos con 11 dígitos y que empiezan con 1 son raros
      // La mayoría de números USA tienen área codes válidos (2XX-9XX)
      const areaCode = cleanPhone.substring(1, 4);
      const firstDigit = parseInt(areaCode[0]);
      
      // Si el área code empieza con 2-9, es USA
      if (firstDigit >= 2) {
        cleanPhone = cleanPhone; // USA correcto
      } else {
        // Probablemente Argentina, agregar 549
        cleanPhone = '549' + cleanPhone;
      }
    }
    // PRIORIDAD 3: Si empieza con 15 y tiene 10-11 dígitos (Argentina local)
    else if (cleanPhone.startsWith('15') && cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      const localNumber = cleanPhone.substring(2); // Quitar el "15"
      cleanPhone = '549' + localNumber; // 54 (país) + 9 (móvil) + número
    }
    // PRIORIDAD 4: Si tiene 10 dígitos
    else if (cleanPhone.length === 10) {
      // Asumir Argentina (la mayoría de casos)
      cleanPhone = '549' + cleanPhone;
    }
    // PRIORIDAD 5: Otros números
    else {
      // Si no empieza con 1 ni con 54, asumir Argentina
      if (!cleanPhone.startsWith('1') && !cleanPhone.startsWith('54')) {
        cleanPhone = '549' + cleanPhone;
      }
    }
    
    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Generar URL de WhatsApp Web/App (sin el +)
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    return {
      success: true,
      url: whatsappUrl
    };
  } catch (error) {
    return {
      success: false,
      error: "Error al generar URL de WhatsApp"
    };
  }
}

// ============================================
// VALIDACIÓN DE TELÉFONO (Internacional)
// ============================================

function isValidPhoneNumber(phone) {
  if (!phone) return false;
  
  // Limpiar el número
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Regex para números argentinos
  const argentinePhoneRegex = /^(\+54|0054|54)?[\s\-]?9?[\s\-]?(\d{2,4})[\s\-]?(\d{6,8})$/;
  
  // Regex para números USA/Canadá (1 + 10 dígitos)
  const usaPhoneRegex = /^(\+?1)?[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}$/;
  
  // Validación general: al menos 8 dígitos
  const generalPhoneRegex = /\d{8,}/;
  
  // Aceptar si coincide con alguno de los patrones
  return argentinePhoneRegex.test(cleanPhone) || 
         usaPhoneRegex.test(cleanPhone) || 
         generalPhoneRegex.test(cleanPhone);
}

export {
  generatePaymentReceiptMessage,
  generateWhatsAppUrl,
  isValidPhoneNumber,
  formatPrice,
  formatPriceUSD
};



