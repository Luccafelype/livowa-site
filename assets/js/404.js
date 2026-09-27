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
          // /c/{apelido} → /c/?h={apelido}  (a página pública da criadora).
          // O resto da query segue junto: ?dieta=<id> põe a dieta em foco (T40).
          if (parts.length >= 2 && parts[0] === 'c') {
            var h = parts[1];
            if (h && h !== 'index.html') {
              var resto = new URLSearchParams(location.search);
              resto.delete('h');
              var extra = resto.toString();
              location.replace('/c/?h=' + encodeURIComponent(h) + (extra ? '&' + extra : ''));
            }
          }
        } catch (e) { /* fall through to 404 page */ }
      })();
