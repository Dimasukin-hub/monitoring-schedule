async function testStok() {
  const res = await fetch('http://localhost:3000/api/stok?category=BK&page=1&limit=5');
  if (res.ok) {
    const json = await res.json();
    console.log('Stok API success, total:', json.pagination.total);
    console.log('Sample item:', json.data[0]);
  } else {
    console.log('Stok API error:', res.status);
  }
}
testStok().catch(console.error);
