const fetch = require('node-fetch'); // If needed, or just use core fetch in Node 18+

async function testPost() {
  const shift = {
    id: `SH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    businessId: 'bus_845fz',
    startTime: new Date().toISOString(),
    openedBy: 'SYSTEM_TEST',
    transactionsCount: 0,
    cashTotal: 0,
    mpesaTotal: 0,
    cardTotal: 0,
    totalSales: 0,
    openingStockSnapshot: [{ productId: '1', productName: 'Tusker Lager', quantity: 10 }],
    status: 'OPEN',
    openTabsTransferred: []
  };

  try {
    const res = await fetch('http://localhost:5000/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: 'bus_845fz', shift })
    });
    
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testPost();
