/* Roda antes do corpo: força HTTPS e marca que há JS ativo. */
if (location.protocol === 'http:') location.replace(location.href.replace('http:', 'https:'));
document.documentElement.classList.add('js');
