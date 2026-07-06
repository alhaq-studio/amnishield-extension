(function(){
  const fb = document.getElementById('fb');
  const submit = document.getElementById('submit');
  const thanks = document.getElementById('thankyou');
  if (!submit) return;
  submit.addEventListener('click', () => {
    try {
      const text = (fb?.value || '').trim();
      if (text) {
        const body = encodeURIComponent(text);
  window.open('mailto:support@alhaq.uk?subject=Amn%20Shield%20Feedback&body=' + body);
      }
      if (thanks) thanks.classList.remove('hidden');
    } catch {}
  });
})();
