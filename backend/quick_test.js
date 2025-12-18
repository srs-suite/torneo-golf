// Quick test para ver exactamente qué está pasando
import { getMemberById } from './src/services/database.js';
import { initializeDatabase } from './src/config/database.js';

async function test() {
    await initializeDatabase();
    
    console.log('\n🧪 Testing getMemberById directly...\n');
    
    // Probar con 1 parámetro (correcto según el código)
    try {
        console.log('Test 1: getMemberById(547)');
        const member = await getMemberById(547);
        console.log('✅ Result:', member ? 'Found' : 'Not found');
        if (member) {
            console.log('   Name:', member.first_name, member.last_name);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Probar con 2 parámetros (para ver si da error)
    try {
        console.log('\nTest 2: getMemberById(1, 547) - con clubId');
        const member = await getMemberById(1, 547);
        console.log('✅ Result:', member ? 'Found' : 'Not found');
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    process.exit(0);
}

test();


