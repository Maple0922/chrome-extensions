document.addEventListener('keydown', function (e) {
  if (e.keyCode === 67 && e.metaKey && e.shiftKey) {
    e.preventDefault();

    const url = window.location.href;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

    if (match) {
      const spreadsheetId = match[1];
      const gidMatch = url.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

      window.open(csvUrl, '_blank');
    }
  }
}, true);
