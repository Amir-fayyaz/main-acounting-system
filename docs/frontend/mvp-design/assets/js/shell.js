/* Shell behaviour: theme, collapse, drawer, submenus */
(function(){
  var app=document.getElementById('app'),
      mq=window.matchMedia('(max-width:1023px)'),
      closeBtn=document.getElementById('closeBtn'),
      root=document.documentElement;

  function store(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function read(k){try{return localStorage.getItem(k)}catch(e){return null}}

  /* theme */
  var theme=read('panel-theme');
  if(!theme)theme=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  root.classList.toggle('dark',theme==='dark');
  document.getElementById('themeBtn').addEventListener('click',function(){
    var d=root.classList.toggle('dark');store('panel-theme',d?'dark':'light');
  });

  /* collapse (desktop) */
  if(read('panel-mini')==='1')app.classList.add('is-mini');
  document.getElementById('collapseBtn').addEventListener('click',function(){
    var m=app.classList.toggle('is-mini');store('panel-mini',m?'1':'0');
    this.setAttribute('aria-label',m?'باز کردن منو':'جمع کردن منو');
  });

  /* drawer (mobile) */
  function openMenu(){app.classList.add('is-open')}
  function closeMenu(){app.classList.remove('is-open')}
  function syncClose(){closeBtn.style.display=mq.matches?'grid':'none'}
  syncClose();
  mq.addEventListener('change',function(){closeMenu();syncClose()});
  document.getElementById('menuBtn').addEventListener('click',openMenu);
  document.getElementById('overlay').addEventListener('click',closeMenu);
  closeBtn.addEventListener('click',closeMenu);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});

  /* submenus */
  document.querySelectorAll('.has-sub>.nav-item').forEach(function(btn){
    btn.addEventListener('click',function(){
      var li=btn.parentElement,o=li.classList.toggle('open');
      btn.setAttribute('aria-expanded',o);
    });
  });

  })();