/**
 * Prueba directa POST /activate contra el servidor (sin Electron).
 */
import axios from 'axios';

async function test() {
  try {
    const res = await axios.post(
      'http://127.0.0.1:3000/activate',
      {
        license_key: 'TEST-POSTRIX-0001',
        hardware_id: 'HW-46964295-MX',
      },
      { validateStatus: () => true }
    );
    console.log('✅ Respuesta HTTP', res.status, ':', res.data);
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

test();
