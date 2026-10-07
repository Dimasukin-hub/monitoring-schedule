const http = require('http');

http.get('http://localhost:3000/api/stok?category=BK&limit=5', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Success:', json.success);
      console.log('Pagination:', json.pagination);
      console.log('Category Stats:', json.categoryStats);
      console.log('Sample Data (first 2):', json.data?.slice(0, 2));
    } catch (e) {
      console.log('Raw output:', data.slice(0, 300));
    }
  });
}).on('error', (err) => {
  console.error('HTTP Error:', err.message);
});
