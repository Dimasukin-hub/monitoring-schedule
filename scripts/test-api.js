async function test() {
  const res = await fetch('http://localhost:3000/api/lands?year=2026&limit=5');
  const json = await res.json();
  console.log('Success:', json.success);
  console.log('Pagination (year=2026):', json.pagination);
  console.log('Filters:', {
    wilayahs: json.filters?.wilayahs,
    years: json.filters?.years,
    defaultYear: json.filters?.defaultYear,
  });
  console.log('Data count:', json.data?.length);
  if (json.data?.length > 0) {
    console.log('Sample item:', {
      id: json.data[0].id,
      lokasi: json.data[0].lokasi,
      wilayah: json.data[0].wilayah,
      year: json.data[0].year,
    });
  }
}

test().catch(console.error);
