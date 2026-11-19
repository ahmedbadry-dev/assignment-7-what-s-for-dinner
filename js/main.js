/* Assignment 8: recipe objects, arrays, functions and random selection. */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  function renderIcons(root = document) {
    root.querySelectorAll('i.fa-solid').forEach(element => {
      const iconClass = [...element.classList].find(name => name.startsWith('fa-') && name !== 'fa-solid');
      const icon = recipeIcons[iconClass?.slice(3)];
      if (!icon) return;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', icon.viewBox);
      svg.setAttribute('class', 'recipe-icon');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      const dimensions = icon.viewBox.split(' ').map(Number);
      svg.style.width = `${dimensions[2] / dimensions[3]}em`;
      icon.paths.forEach(outline => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', outline);
        svg.append(path);
      });
      element.classList.remove('fa-solid', iconClass);
      element.replaceChildren(svg);
    });
  }
  const storageKey = 'whats-for-dinner';
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Storage can be disabled. */ }
  let savedIds = Array.isArray(stored.saved) ? stored.saved.filter(id => recipes.some(recipe => recipe.id === id)) : [];
  let recentIds = Array.isArray(stored.recent) ? stored.recent.filter(id => recipes.some(recipe => recipe.id === id)) : [];
  let preferences = {
    maxTime: ['all', '30', '45'].includes(stored.preferences?.maxTime) ? stored.preferences.maxTime : 'all',
    difficulty: ['all', 'Easy', 'Intermediate'].includes(stored.preferences?.difficulty) ? stored.preferences.difficulty : 'all'
  };
  let currentRecipe = null;
  let toastTimer;

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({saved: savedIds, recent: recentIds, preferences})); } catch { /* The recipes still work without storage. */ }
  }

  function announce(message) {
    const status = byId('status-message');
    clearTimeout(toastTimer);
    status.textContent = message;
    status.classList.add('is-visible');
    toastTimer = setTimeout(() => status.classList.remove('is-visible'), 3000);
  }

  function selectRandomRecipe() {
    const eligible = recipes.filter(recipe =>
      (preferences.maxTime === 'all' || recipe.totalTime <= Number(preferences.maxTime)) &&
      (preferences.difficulty === 'all' || recipe.difficulty === preferences.difficulty)
    );
    const choices = eligible.filter(recipe => recipe.id !== currentRecipe?.id);
    // Filter before choosing: this never loops, even if Math.random repeats.
    const pool = choices.length ? choices : eligible;
    if (!pool.length) { announce('No recipes match these settings. Choose a longer time or any difficulty.'); return; }
    displayRecipe(pool[Math.floor(Math.random() * pool.length)]);
  }

  function numberedList(listId, items, type) {
    const elements = items.map((text, index) => {
      const item = document.createElement('li');
      const number = document.createElement('span');
      number.className = `${type}-number`;
      number.textContent = index + 1;
      number.setAttribute('aria-hidden', 'true');
      const content = document.createElement(type === 'instruction' ? 'p' : 'span');
      content.textContent = text;
      item.append(number, content);
      return item;
    });
    byId(listId).replaceChildren(...elements);
  }

  function renderNutrition(nutrition) {
    const fields = [
      ['calories', 'Calories', 'fire'], ['protein', 'Protein', 'dumbbell'],
      ['carbs', 'Carbohydrates', 'wheat-awn'], ['fat', 'Fat', 'droplet'],
      ['fiber', 'Fiber', 'seedling'], ['sodium', 'Sodium', 'cube']
    ];
    byId('nutrition-list').replaceChildren(...fields.map(([key, label, icon]) => {
      const item = document.createElement('div');
      item.className = 'nutrition-item';
      const term = document.createElement('dt');
      const iconBox = document.createElement('span');
      iconBox.className = `nutrition-icon nutrition-${key}`;
      const symbol = document.createElement('i');
      symbol.className = `fa-solid fa-${icon}`;
      symbol.setAttribute('aria-hidden', 'true');
      iconBox.append(symbol);
      term.append(iconBox, document.createTextNode(label));
      const value = document.createElement('dd');
      value.id = `${key}-value`;
      value.textContent = nutrition[key];
      item.append(term, value);
      return item;
    }));
  }

  function updateSaveButton() {
    const saved = savedIds.includes(currentRecipe.id);
    const button = byId('save-recipe-btn');
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', saved ? 'Unsave recipe' : 'Save recipe');
    button.title = saved ? 'Unsave recipe' : 'Save recipe';
  }

  function displayRecipe(recipe) {
    currentRecipe = recipe;
    byId('recipe-name').textContent = recipe.name;
    byId('recipe-description').textContent = recipe.description;
    byId('recipe-image').src = recipe.imgCover;
    byId('recipe-image').alt = recipe.name;
    byId('rating-average').textContent = recipe.ratingsAverage;
    byId('rating-quantity').textContent = `(${recipe.ratingsQuantity} reviews)`;
    byId('prep-time-display').textContent = recipe.prepTime;
    byId('cook-time-display').textContent = recipe.cookTime;
    byId('servings-display').textContent = recipe.servings;
    byId('difficulty-badge').textContent = recipe.difficulty;
    byId('category-badge').textContent = recipe.category;
    byId('time-warning').hidden = recipe.totalTime <= 45;
    numberedList('ingredients-list', recipe.ingredients, 'ingredient');
    numberedList('instructions-list', recipe.instructions, 'instruction');
    renderNutrition(recipe.nutrition);
    byId('tips-list').replaceChildren(...recipe.tips.map(tip => {
      const item = document.createElement('li');
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-circle-check';
      icon.setAttribute('aria-hidden', 'true');
      const content = document.createElement('p');
      content.textContent = tip;
      item.append(icon, content);
      return item;
    }));
    document.querySelectorAll('.tab-content').forEach(panel => { panel.scrollTop = 0; });
    recentIds = [recipe.id, ...recentIds.filter(id => id !== recipe.id)].slice(0, 19);
    updateSaveButton();
    renderIcons();
    persist();
  }

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function activateTab(tab, focus = false) {
    tabs.forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      byId(button.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
    });
  });

  byId('try-another-btn').addEventListener('click', () => {
    selectRandomRecipe();
    byId('recipe-display-section').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });

  byId('save-recipe-btn').addEventListener('click', () => {
    const saved = savedIds.includes(currentRecipe.id);
    savedIds = saved ? savedIds.filter(id => id !== currentRecipe.id) : [...savedIds, currentRecipe.id];
    updateSaveButton();
    persist();
    announce(saved ? 'Recipe removed from saved recipes' : 'Recipe saved');
  });

  byId('share-recipe-btn').addEventListener('click', async () => {
    const url = new URL(location.href);
    url.hash = currentRecipe.id;
    const text = `${currentRecipe.name} — ${currentRecipe.description}`;
    try {
      if (navigator.share) await navigator.share({title: currentRecipe.name, text, url: url.href});
      else if (navigator.clipboard && location.protocol !== 'file:') { await navigator.clipboard.writeText(url.href); announce('Recipe link copied'); }
      else { showDialog('Share Recipe'); const input = document.createElement('input'); input.value = url.href; input.readOnly = true; input.style.width = '100%'; input.setAttribute('aria-label', 'Recipe link'); byId('dialog-content').append(input); input.select(); }
    } catch (error) { if (error.name !== 'AbortError') announce('Could not share this recipe. Please try again.'); }
  });

  function setMenu(open) {
    byId('mobile-menu').hidden = !open;
    byId('mobile-menu-btn').setAttribute('aria-expanded', String(open));
    byId('mobile-menu-btn').setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    byId('mobile-menu-btn').querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    renderIcons(byId('mobile-menu-btn'));
  }
  byId('mobile-menu-btn').addEventListener('click', () => setMenu(byId('mobile-menu').hidden));
  document.addEventListener('click', event => { if (!event.composedPath().includes(byId('header'))) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !byId('mobile-menu').hidden) { setMenu(false); byId('mobile-menu-btn').focus(); } });
  matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  const dialog = byId('utility-dialog');
  function showDialog(title) {
    byId('dialog-title').textContent = title;
    byId('dialog-content').replaceChildren();
    if (!dialog.open) dialog.showModal();
    return byId('dialog-content');
  }
  byId('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

  function showCollection(type) {
    const content = showDialog(type === 'saved' ? 'Saved Recipes' : 'Recent Recipes');
    const ids = type === 'saved' ? savedIds : recentIds;
    if (!ids.length) { content.textContent = 'No saved recipes yet. Tap the bookmark on a recipe to save it here.'; return; }
    const list = document.createElement('ul');
    list.className = 'collection-list';
    ids.forEach(id => {
      const recipe = recipes.find(meal => meal.id === id);
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.className = 'collection-recipe';
      const photo = document.createElement('img'); photo.src = recipe.imgCover; photo.alt = '';
      const info = document.createElement('span');
      const title = document.createElement('strong'); title.textContent = recipe.name;
      const detail = document.createElement('small'); detail.textContent = `${recipe.totalTime} min · ${recipe.category}`;
      info.append(title, detail); button.append(photo, info); item.append(button); list.append(item);
      button.addEventListener('click', () => { displayRecipe(recipe); dialog.close(); byId('recipe-name').scrollIntoView({block:'nearest'}); });
    });
    content.append(list);
  }

  function showSettings() {
    const content = showDialog('Settings');
    const form = document.createElement('form'); form.className = 'settings-form';
    [['maxTime', 'Maximum recipe time', [['all','Any time'],['30','30 minutes'],['45','45 minutes']]], ['difficulty', 'Difficulty', [['all','Any difficulty'],['Easy','Easy'],['Intermediate','Intermediate']]]].forEach(([name, label, options]) => {
      const field = document.createElement('label'); field.textContent = label;
      const select = document.createElement('select'); select.name = name;
      options.forEach(([value,text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); });
      select.value = preferences[name]; field.append(select); form.append(field);
    });
    const button = document.createElement('button'); button.type = 'submit'; button.className = 'primary-button'; button.textContent = 'Save Settings'; form.append(button);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const fields = new FormData(form);
      const next = {maxTime: fields.get('maxTime'), difficulty: fields.get('difficulty')};
      const matches = recipes.some(recipe => (next.maxTime === 'all' || recipe.totalTime <= Number(next.maxTime)) && (next.difficulty === 'all' || recipe.difficulty === next.difficulty));
      if (!matches) { announce('No recipes match. Try a longer time or any difficulty.'); return; }
      preferences = next; persist(); dialog.close(); announce('Recipe preferences saved');
    });
    content.append(form);
  }

  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    setMenu(false);
    const action = button.dataset.action;
    if (action === 'saved' || action === 'recent') showCollection(action);
    if (action === 'settings') showSettings();
    if (action === 'profile') {
      const content = showDialog('Your Profile');
      const summary = document.createElement('div'); summary.className = 'profile-summary';
      const img = document.createElement('img'); img.src = 'images/profile.jpg'; img.alt = '';
      const text = document.createElement('p'); text.textContent = `${savedIds.length} saved recipes · ${recentIds.length} recently viewed`;
      summary.append(img, text);
      const note = document.createElement('p'); note.className = 'profile-note'; note.textContent = 'Your recipes and preferences are saved in this browser.';
      content.append(summary, note);
    }
  }));

  function showLinkedRecipe() {
    const recipe = recipes.find(meal => meal.id === location.hash.slice(1));
    if (recipe) { displayRecipe(recipe); return true; }
    return false;
  }
  window.addEventListener('hashchange', showLinkedRecipe);
  if (!showLinkedRecipe()) selectRandomRecipe();
  renderIcons();
})();
