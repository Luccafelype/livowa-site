(function () {
        try {
          var parts = location.pathname.split('/').filter(Boolean);
          // /lista/{token} → /lista/?token={token}
          if (parts.length >= 2 && parts[0] === 'lista') {
            var token = parts[1];
            if (token && token !== 'index.html') {
              location.replace('/lista/?token=' + encodeURIComponent(token));
            }
          }
          // /c/{apelido} → /c/?h={apelido}  (a página pública da criadora)
          if (parts.length >= 2 && parts[0] === 'c') {
            var h = parts[1];
            if (h && h !== 'index.html') {
              location.replace('/c/?h=' + encodeURIComponent(h));
            }
          }
        } catch (e) { /* fall through to 404 page */ }
      })();
