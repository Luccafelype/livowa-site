(function () {
        try {
          var parts = location.pathname.split('/').filter(Boolean);
          if (parts.length >= 2 && parts[0] === 'lista') {
            var token = parts[1];
            if (token && token !== 'index.html') {
              location.replace('/lista/?token=' + encodeURIComponent(token));
            }
          }
        } catch (e) { /* fall through to 404 page */ }
      })();
