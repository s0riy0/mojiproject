(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- ambient floating hearts (every page) ----
  var amb = document.querySelector('.ambient');
  if(amb && !reduceMotion){
    for(var i=0;i<10;i++){
      var s = document.createElement('span');
      s.textContent = '♥';
      s.style.left = (Math.random()*100) + '%';
      s.style.setProperty('--dx', (Math.random()*80-40) + 'px');
      s.style.animationDelay = (Math.random()*16) + 's';
      s.style.animationDuration = (12 + Math.random()*10) + 's';
      s.style.fontSize = (12 + Math.random()*14) + 'px';
      amb.appendChild(s);
    }
  }

  // filled in below by the reel block, if this page has one — lets the
  // loader (index.html) turn sound on for the video already playing
  // underneath it, the moment the visitor taps to open.
  var unlockReelSound = function(){};

  // ---- fullscreen video reel (index.html's opening reel, and videos.html): 1 clip fills the screen, swipe left/right for the next ----
  var reelsViewport = document.getElementById('videoTrack');
  var reelsTrack = document.getElementById('reelsTrack');
  if(reelsViewport && reelsTrack){
    var slides = Array.prototype.slice.call(reelsTrack.querySelectorAll('.reel-slide'));
    var dotsWrap = document.getElementById('videoDots');
    var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];
    var active = 0;

    function layout(){
      reelsTrack.style.transform = 'translateX(-' + (active * 100) + '%)';
      slides.forEach(function(slide, i){
        var video = slide.querySelector('video');
        if(!video) return;
        if(i === active){ var p = video.play(); if(p && p.catch) p.catch(function(){}); }
        else{ video.pause(); }
      });
      dots.forEach(function(d, i){ d.classList.toggle('on', i === active); });
    }

    function goTo(i){
      active = Math.max(0, Math.min(slides.length - 1, i));
      layout();
    }

    dots.forEach(function(d, i){ d.addEventListener('click', function(){ goTo(i); }); });

    // videos start muted so mobile browsers allow them to autoplay.
    // unlockReelSound() turns sound on for the active clip (and makes sure
    // it's playing) without touching play/pause otherwise — called from
    // the loader tap on index.html, or from the first tap on the video
    // itself when this page is reached directly (no loader, e.g. videos.html
    // via the back arrow from photos.html).
    var soundOn = false;
    unlockReelSound = function(){
      if(soundOn) return;
      soundOn = true;
      var v = slides[active] && slides[active].querySelector('video');
      if(!v) return;
      v.muted = false;
      // it's usually been playing silently for a few seconds already
      // (behind the loading screen, or before the visitor got to it) —
      // restart from the top so the sound and picture feel in sync
      // the moment it's unlocked, instead of picking up mid-clip.
      v.currentTime = 0;
      var p = v.play();
      if(p && p.catch) p.catch(function(){});
    };

    // tap a slide: first tap just turns sound on (see above) and does NOT
    // also toggle pause — otherwise the video would unmute and immediately
    // pause on that same tap, going silent again. Every tap after that
    // toggles play/pause as normal.
    slides.forEach(function(slide){
      slide.addEventListener('click', function(){
        var v = slide.querySelector('video');
        if(!v) return;
        if(!soundOn){ unlockReelSound(); return; }
        v.paused ? v.play() : v.pause();
      });
    });

    // swipe / drag left-right to switch clips
    var startX = null, dragging = false;
    var onDown = function(x){ startX = x; dragging = true; };
    var onUp = function(x){
      if(!dragging || startX === null) return;
      dragging = false;
      var dx = x - startX;
      if(Math.abs(dx) > 40){ goTo(active + (dx < 0 ? 1 : -1)); }
      startX = null;
    };
    reelsViewport.addEventListener('pointerdown', function(e){ onDown(e.clientX); });
    window.addEventListener('pointerup', function(e){ onUp(e.clientX); });
    reelsViewport.addEventListener('touchstart', function(e){ onDown(e.touches[0].clientX); }, {passive:true});
    reelsViewport.addEventListener('touchend', function(e){ onUp(e.changedTouches[0].clientX); }, {passive:true});
    window.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft') goTo(active - 1);
      if(e.key === 'ArrowRight') goTo(active + 1);
    });

    layout();

    // when the active clip finishes: go to the next clip, or — on the last
    // clip — move on to the next page of the site. Clips that loop (like
    // the one behind index.html's loader) never fire 'ended', so this only
    // ever kicks in on a page like videos.html where the video plays once.
    var pagenavLinks = document.querySelectorAll('.reel-pagenav a:not(.disabled)[href]');
    var nextPageHref = pagenavLinks.length ? pagenavLinks[pagenavLinks.length - 1].getAttribute('href') : null;
    slides.forEach(function(slide, i){
      var video = slide.querySelector('video');
      if(!video) return;
      video.addEventListener('ended', function(){
        if(i !== active) return; // stale event from an inactive clip
        if(i < slides.length - 1){ goTo(i + 1); }
        else if(nextPageHref){ window.location.href = nextPageHref; }
      });
    });
  }

  // ---- loader (index.html): tap the heart to open. The video reel above
  // is already playing muted underneath it — this tap is what the browser
  // needs to allow the video to play WITH sound too (mobile browsers block
  // audio until the visitor has actually touched the page at least once,
  // there's no way around that from code). One tap = both open + sound. ----
  var loader = document.getElementById('loader');
  if(loader){
    var opened = false;
    var openNow = function(){
      if(opened) return;
      opened = true;
      if(reduceMotion){ loader.style.display = 'none'; }
      else{ loader.classList.add('hide'); }
      if(amb) amb.style.display = 'none';
      unlockReelSound();
    };
    loader.addEventListener('click', openNow);
  }

  // ---- photo cards (photos.html) ----
  // Landscape/desktop: a grid, tap any card to flip it.
  // Portrait phone: one photo at a time — swipe left/right to switch, tap (no drag) to flip.
  var photoGrid = document.getElementById('photoGrid');
  var photoTrack = document.getElementById('photoTrack');
  if(photoGrid && photoTrack){
    var photoCards = Array.prototype.slice.call(photoTrack.querySelectorAll('.photo-card'));
    var photoDotsWrap = document.getElementById('photoDots');
    var photoDots = photoDotsWrap ? Array.prototype.slice.call(photoDotsWrap.children) : [];
    var pActive = 0;
    var isPortrait = function(){ return window.matchMedia('(orientation: portrait)').matches; };

    function photoLayout(){
      photoTrack.style.transform = isPortrait() ? 'translateX(-' + (pActive * 100) + '%)' : '';
      photoDots.forEach(function(d, i){ d.classList.toggle('on', i === pActive); });
    }
    function photoGoTo(i){
      pActive = Math.max(0, Math.min(photoCards.length - 1, i));
      photoLayout();
    }
    photoDots.forEach(function(d, i){ d.addEventListener('click', function(){ photoGoTo(i); }); });
    window.addEventListener('resize', photoLayout);
    window.addEventListener('orientationchange', photoLayout);

    var pStartX = null, pStartY = null, pDown = false, pMoved = false;
    photoGrid.addEventListener('pointerdown', function(e){ pStartX = e.clientX; pStartY = e.clientY; pDown = true; pMoved = false; });
    photoGrid.addEventListener('pointermove', function(e){
      if(!pDown) return;
      if(Math.abs(e.clientX - pStartX) > 6 || Math.abs(e.clientY - pStartY) > 6) pMoved = true;
    });
    window.addEventListener('pointerup', function(e){
      if(!pDown) return;
      pDown = false;
      if(!isPortrait()) return;
      var dx = e.clientX - pStartX;
      if(Math.abs(dx) > 40){ photoGoTo(pActive + (dx < 0 ? 1 : -1)); }
    });

    photoCards.forEach(function(card){
      card.addEventListener('click', function(){
        if(pMoved && isPortrait()){ pMoved = false; return; } // was a swipe, not a tap — don't flip
        card.classList.toggle('flipped');
      });
    });

    photoLayout();
  }

  // ---- yes / no (question.html) ----
  var btnNo = document.getElementById('btnNo');
  var btnYes = document.getElementById('btnYes');
  var qa = document.getElementById('qaButtons');
  if(btnNo && btnYes && qa){
    var dodges = 0;
    var dodge = function(){
      if(reduceMotion) return;
      dodges = Math.min(dodges + 1, 6);
      var maxX = Math.max(qa.clientWidth - btnNo.offsetWidth - 20, 40);
      var x = (Math.random() * maxX) - maxX/2;
      var y = (Math.random() * 40) - 20;
      btnNo.style.position = 'relative';
      btnNo.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      var scale = 1 + dodges * 0.06;
      btnYes.style.transform = 'scale(' + Math.min(scale, 1.4) + ')';
    };
    btnNo.addEventListener('mouseenter', dodge);
    btnNo.addEventListener('touchstart', function(e){ e.preventDefault(); dodge(); }, {passive:false});
    btnNo.addEventListener('click', function(e){ e.preventDefault(); dodge(); });

    btnYes.addEventListener('click', function(){
      qa.style.display = 'none';
      var qText = document.getElementById('questionText');
      if(qText) qText.textContent = 'เยิบๆ !';
      var celebrate = document.getElementById('celebrate');
      if(celebrate) celebrate.classList.add('show');
      document.body.classList.add('celebrating');

      var bgVideo = document.getElementById('celebrateVideo');
      if(bgVideo){
        bgVideo.classList.add('show');
        // this play() runs right inside the "เป็น" click, which is a real
        // user gesture — so unlike the opening reel, this one can just
        // unmute and play with sound directly, no unlock-on-next-tap needed.
        bgVideo.muted = false;
        var vp = bgVideo.play();
        if(vp && vp.catch) vp.catch(function(){});
      }
      var scrim = document.getElementById('celebrateScrim');
      if(scrim) scrim.classList.add('show');

      if(!reduceMotion) burstConfetti();
    });
  }

  // ---- confetti burst (canvas, lightweight — question.html) ----
  function burstConfetti(){
    var canvas = document.getElementById('confetti');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width = window.innerWidth;
    var H = canvas.height = window.innerHeight;
    var colors = ['#ff4d6d', '#e2a23f', '#ff97ae', '#f6ecef'];
    var pieces = [];
    for(var i=0;i<70;i++){
      pieces.push({
        x: W/2, y: H*0.4,
        vx: (Math.random()-0.5) * 9,
        vy: (Math.random()-1.6) * 9,
        size: 4 + Math.random()*5,
        color: colors[Math.floor(Math.random()*colors.length)],
        rot: Math.random()*Math.PI,
        vr: (Math.random()-0.5)*0.3,
        life: 0
      });
    }
    function tick(){
      ctx.clearRect(0,0,W,H);
      var alive = false;
      pieces.forEach(function(p){
        p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
        if(p.life < 130){
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, 1 - p.life/130);
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
          ctx.restore();
        }
      });
      if(alive) requestAnimationFrame(tick);
      else ctx.clearRect(0,0,W,H);
    }
    tick();
  }
})();
