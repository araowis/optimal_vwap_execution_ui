const http = require('http');

http.get('http://localhost:5000/api/clients', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const clients = JSON.parse(data);
    if (clients.length > 0) {
      const clientId = clients[0].id;
      http.get(`http://localhost:5000/api/clients/${clientId}/watchlists`, (res2) => {
        let wData = '';
        res2.on('data', (c) => wData += c);
        res2.on('end', () => {
          console.log(JSON.stringify(JSON.parse(wData), null, 2));
        });
      });
    }
  });
});
