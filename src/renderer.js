/**
 * Lógica de interfaz — Postrix by Solvix (renderer).
 */
(function () {
  const api = window.postrix;
  if (!api) {
    console.error('postrix API no disponible (preload)');
    return;
  }

  let lang =
    navigator.language && navigator.language.startsWith('en') ? 'en' : 'es';

  const STR = {
    es: {
      activation_sub: 'by Solvix',
      activation_welcome: 'Bienvenido a Postrix 👋',
      activation_desc:
        'Ingresa la clave que recibiste en tu correo electrónico al momento de tu compra.',
      activation_help_before: '¿No encuentras tu clave? Escríbenos a',
      license_placeholder: 'Ej: XXXX-XXXX-XXXX-XXXX',
      label_license: 'Clave de licencia',
      btn_activate: 'Activar licencia',
      err_network:
        'Sin conexión a internet. Verifica tu conexión e intenta de nuevo.',
      err_invalid_key:
        'Clave de licencia incorrecta. Verifica el email que recibiste al comprar.',
      err_inactive_license:
        'Tu licencia no está activa. Contáctanos en soporte@solvix.mx',
      err_invalid: 'No pudimos validar la clave. Intenta de nuevo o contacta soporte.',
      err_hw:
        'Esta licencia está activada en otro equipo. Contáctanos en soporte@solvix.mx',
      tab_campaign: 'Mi Campaña',
      tab_groups: 'Mis Grupos',
      tab_content: 'Mi Publicación',
      tab_history: 'Historial',
      tab_config: 'Configuración',
      btn_settings: 'Ajustes',
      btn_update_pay: 'Pagar update',
      update_banner: 'Hay una nueva versión disponible.',
      btn_start: '▶ INICIAR PUBLICACIÓN',
      btn_pause: '⏸ PAUSAR',
      btn_stop: '⏹ DETENER',
      stat_line_posts: 'Publicaciones realizadas hoy: {n}',
      stat_line_groups: 'Grupos en tu lista: {n}',
      stat_line_next: 'Próxima publicación en: {t}',
      stat_line_rate: 'Publicaciones exitosas: {p}',
      stat_next_na: '—',
      log_live: 'Actividad reciente:',
      status_running: 'Activo',
      status_paused: 'Pausado',
      status_stopped: 'Detenido',
      header_stopped_title: 'Detenido',
      header_stopped_sub: 'El bot no está publicando',
      header_paused_title: 'Pausado',
      header_paused_sub: 'Publicación pausada temporalmente',
      header_active_title: 'Activo',
      header_active_sub: 'Publicando en tus grupos',
      header_waiting_title: 'Esperando',
      header_waiting_sub: 'Próxima publicación en {t}',
      checklist_title: 'Para publicar necesitas:',
      checklist_fb: 'Cuenta Facebook conectada',
      checklist_groups: 'Agrega al menos 1 grupo',
      checklist_post: 'Agrega al menos 1 publicación activa',
      checklist_all_ready: '🚀 ¡Todo listo! Puedes iniciar',
      toast_title: '✅ ¡Publicado exitosamente!',
      toast_groups_added: '✅ Se agregaron {n} grupos a tu lista',
      toast_select_groups_first: '⚠️ Selecciona al menos un grupo primero',
      preview_heading: '👁 Vista previa de tu publicación',
      preview_sub: 'Así se verá en Facebook',
      preview_meta: 'Grupo público · Ahora',
      preview_like: 'Me gusta',
      preview_comment: 'Comentar',
      preview_share: 'Compartir',
      preview_empty: '(Escribe tu mensaje en una versión activa)',
      preview_version_of: 'Versión {x} de {y} activas',
      preview_tab_v: 'V{n}',
      tooltip_when:
        'Define el horario en que tu bot estará activo publicando automáticamente',
      tooltip_frequency:
        'El tiempo de espera entre cada ronda de publicaciones en tus grupos',
      campaign_title: 'Mi Campaña',
      campaign_head_sub: 'Controla tu publicación en un solo lugar',
      cq_section_title: 'Configuración rápida',
      cq_interval: '¿Cada cuánto publicar?',
      cq_until: '¿Hasta qué hora publicar hoy?',
      cq_round: '¿En cuántos grupos por ronda?',
      cq_hour_short: 'h',
      btn_start_now: '▶ INICIAR PUBLICACIÓN AHORA',
      btn_resume: '▶ REANUDAR',
      cap_posting: 'Bot publicando…',
      cap_paused: 'Publicación en pausa',
      cap_in_group: 'Publicando en: "{name}" ({i} de {n})',
      prog_ok: 'Publicado en "{name}" ({i}/{n})',
      prog_skip: 'Saltado: "{name}" (sin acceso)',
      prog_skip_marketplace: 'Saltado: "{name}" (grupo de compraventa)',
      prog_skip_pending: 'Saltado: "{name}" (solicitud pendiente)',
      prog_skip_already_today: 'Ya publicado hoy: "{name}"',
      prog_skip_already_recent:
        'Publicado hace {ago} — próximo en {next}: "{name}"',
      prog_err: 'Error en "{name}"',
      prog_wait: 'Esperando {t} para la siguiente ronda',
      stat_posts_today: 'Publicaciones hoy: {n}',
      stat_groups_reached: 'Grupos alcanzados: {n}',
      stat_next_round: 'Próxima ronda: {t}',
      stat_success_rate: 'Tasa de éxito: {p}',
      ready_groups_line: '✅ {n} grupos listos',
      ready_versions_line: '✅ {n} versiones de publicación',
      ready_fb_line: '✅ Facebook conectado',
      label_campaign_name: 'Nombre de la campaña',
      placeholder_campaign: 'Nombre de tu campaña (ej: Promoción Mayo)',
      welcome_title: '🚀 ¿Listo para publicar?',
      welcome_sub: 'Configura tu campaña en 3 pasos:',
      welcome_step1: '✓ 1. Agrega tus grupos',
      welcome_step2: '✓ 2. Sube tu publicación',
      welcome_step3: '✓ 3. Presiona INICIAR',
      btn_go_groups: 'Ir a Grupos',
      btn_go_content: 'Ir a Contenido',
      groups_title: 'Mis Grupos de Facebook',
      groups_subtitle: 'Agrega los grupos donde quieres publicar',
      groups_how_title: '¿Cómo agregar grupos?',
      groups_how_opt1: 'Opción 1: Busca por tema 🔍',
      groups_how_opt2: 'Opción 2: Pega el link del grupo 🔗',
      btn_search_groups_big: '🔍 Buscar grupos por tema',
      btn_add_by_link: '🔗 Agregar grupo por link',
      label_paste_links: 'Pega aquí el link del grupo',
      placeholder_group_urls:
        'Pega aquí el link del grupo de Facebook\nEj: https://www.facebook.com/groups/ventas-gdl',
      btn_extract: 'Agregar a la lista',
      btn_search_groups: 'Buscar grupos',
      btn_import: 'Importar .txt',
      btn_export: 'Exportar lista',
      groups_total_line: 'Tienes',
      groups_total_of: 'grupos · Máximo',
      content_title: 'Mi Publicación',
      content_subtitle:
        'Postrix rotará entre tus versiones para que no parezca repetitivo',
      content_lead:
        'Puedes tener hasta 4 versiones diferentes de tu publicación. El bot las alternará automáticamente para mayor efectividad.',
      slot_version: 'Versión {n}',
      slot_active: 'Activa',
      slot_inactive: 'Inactiva',
      slot_msg_label: 'Tu mensaje:',
      slot_msg_placeholder: 'Escribe aquí lo que quieres publicar en los grupos…',
      slot_img_label: 'Tu imagen:',
      slot_img_btn: '📷 Subir imagen',
      slot_img_hint: '(formatos: JPG, PNG · máx. 5MB)',
      slot_preview: 'Vista previa:',
      slot_no_image: 'Sin imagen',
      last_slot: 'Última versión usada',
      history_title: 'Historial de Publicaciones',
      history_subtitle: 'Aquí puedes ver todo lo que ha publicado tu bot',
      hist_period_label: 'Período:',
      hist_result_label: 'Resultado:',
      hist_today: 'Hoy',
      hist_week: 'Esta semana',
      hist_month: 'Este mes',
      hist_ok: '✅ Exitosas',
      hist_err: '❌ Fallidas',
      hist_all: 'Todas',
      hist_summary_today:
        'Hoy: {n} publicaciones exitosas en {g} grupos diferentes 🎉',
      hist_summary_week:
        'Esta semana: {n} publicaciones exitosas en {g} grupos diferentes 🎉',
      hist_summary_month:
        'Este mes: {n} publicaciones exitosas en {g} grupos diferentes 🎉',
      btn_export_csv: 'Exportar CSV',
      col_date: 'Fecha y hora',
      col_group: 'Grupo',
      col_result: 'Resultado',
      col_members_col: 'Miembros',
      col_status: 'Estado',
      hist_res_ok: '✅ Publicado',
      hist_res_skipped_marketplace: '⏭ Saltado (compraventa)',
      hist_res_skipped_pending: '⏭ Saltado (solicitud pendiente)',
      hist_res_skipped_already_today: '⏭ Ya publicado hoy',
      hist_res_skipped_already_recent:
        '⏭ Publicado hace {ago} — próximo en {next}',
      hist_res_fail: '❌ No se pudo publicar',
      hist_res_reason: '❌ {reason}',
      group_status_active: '✅ Activo',
      group_status_blocked: '❌ No disponible',
      group_members_na: '—',
      fb_section_title: 'Tu Cuenta de Facebook',
      fb_section_sub: 'Conecta la cuenta con la que quieres publicar en los grupos',
      fb_need_connect: '⚠️ Necesitas conectar tu cuenta para publicar',
      fb_no_account: '⚠️ No hay cuenta conectada',
      fb_badge_connected: '✅ Conectado',
      fb_connected_named: 'Conectado como: {name}',
      fb_connected_generic: 'Cuenta de Facebook conectada',
      btn_connect_fb_big: '🔗 Conectar mi cuenta de Facebook',
      fb_connected_as: '✅ Conectado como:',
      btn_fb_update_name: 'Actualizar nombre',
      btn_disconnect_fb: 'Desconectar',
      section_when: '¿Cuándo publicar?',
      section_frequency: '¿Cada cuánto publicar?',
      rule_start: 'Hora inicio',
      rule_end: 'Hora fin',
      rule_interval: 'Intervalo base (min)',
      rule_var: 'Variación ± (min)',
      rule_max_r: 'Máx. grupos / ronda',
      rule_max_d: 'Máx. publicaciones / día',
      notif_title: 'Notificaciones',
      notif_email: 'Email para alertas',
      btn_save: 'Guardar configuración',
      modal_search_title: 'Buscar grupos',
      btn_search: 'Buscar',
      btn_searching: 'Buscando...',
      modal_search_status_loading:
        '🔍 Buscando grupos en Facebook... Esto puede tardar 15-30 segundos',
      modal_search_status_done: '✅ Búsqueda completada',
      modal_search_status_error: '❌ Error al buscar. Intenta de nuevo',
      progress_msg_0: 'Abriendo Facebook...',
      progress_msg_5: 'Buscando grupos con esa palabra...',
      progress_msg_10: 'Filtrando grupos donde eres miembro...',
      progress_msg_15: 'Verificando tipo de cada grupo (compatibles vs compraventa)...',
      search_count_compatible: 'Encontrados: {c} grupos compatibles',
      search_count_excluded_mp: '({m} grupos de compraventa excluidos)',
      search_count_verifying: '{v} verificando…',
      search_sec_compatible: 'Grupos compatibles',
      search_sec_marketplace: 'Solo compraventa',
      search_sec_verifying: 'Verificando…',
      badge_compatible: '✓ Compatible',
      badge_mp_only: '🛍 Solo compraventa',
      badge_verifying: '⏳ Verificando…',
      search_tooltip_mp:
        'Este grupo solo permite publicar productos en venta, no publicaciones de texto',
      search_mp_note:
        '💡 Los grupos marcados como "Solo compraventa" no permiten publicaciones de texto libre. Postrix los excluye automáticamente para evitar errores.',
      btn_close: 'Cerrar',
      btn_add: 'Añadir',
      btn_add_selected: 'Añadir seleccionados',
      col_group_name: 'Nombre',
      search_found: 'Encontrados: {n} grupos donde eres miembro',
      search_no_members_match:
        'No encontramos grupos donde seas miembro con esa palabra clave.\nPrueba con otra palabra como:\ncompras, negocios, emprendedores',
      badge_member: '✓ Miembro',
      badge_pending: 'Pendiente',
      log_activation_ok: '¡Listo! Tu licencia está activa.',
      log_bot_started: '▶ Publicación iniciada. El bot trabajará según tu horario.',
      log_bot_resumed: '▶ Reanudamos la publicación.',
      log_bot_paused: '⏸ Publicación en pausa. Puedes reanudar cuando quieras.',
      log_bot_stopped: '⏹ Publicación detenida.',
      log_settings_saved: '✅ Configuración guardada.',
      log_group_removed: '🗑 Grupo quitado de la lista.',
      log_fb_connected: '✅ Cuenta de Facebook conectada.',
      log_fb_name_updated: '✅ Nombre de Facebook actualizado.',
      log_fb_disconnected: 'Cuenta de Facebook desconectada.',
      log_groups_added: '✅ Se agregaron grupos a tu lista.',
      log_add_members_only: 'Selecciona grupos donde ya eres miembro (casilla).',
      log_added_members: '✅ Grupos añadidos (solo donde eres miembro).',
      toast_marketplace_skipped:
        'Se omitieron {n} grupo(s) solo compraventa (no admiten publicación de texto).',
      toast_verify_marketplace_failed:
        'No se pudo verificar los grupos. Intenta de nuevo o revisa la conexión.',
      restriction_title: 'Facebook detectó actividad inusual',
      restriction_body:
        'Tu bot está pausado automáticamente por 24 horas para proteger tu cuenta.',
      restriction_until_line: 'Reactivación automática: {dt}',
      hist_res_fb_restriction: '🚨 Restricción de Facebook (pausa)',
    },
    en: {
      activation_sub: 'by Solvix',
      activation_welcome: 'Welcome to Postrix 👋',
      activation_desc: 'Enter the key you received by email when you purchased.',
      activation_help_before: "Can't find your key? Write us at",
      license_placeholder: 'E.g. XXXX-XXXX-XXXX-XXXX',
      label_license: 'License key',
      btn_activate: 'Activate license',
      err_network:
        'No internet connection. Check your network and try again.',
      err_invalid_key:
        'Incorrect license key. Check the email you received when you purchased.',
      err_inactive_license:
        'Your license is not active. Contact us at soporte@solvix.mx',
      err_invalid: 'We could not validate the key. Try again or contact support.',
      err_hw: 'This license is activated on another device. Contact soporte@solvix.mx',
      tab_campaign: 'My Campaign',
      tab_groups: 'My Groups',
      tab_content: 'My Post',
      tab_history: 'History',
      tab_config: 'Settings',
      btn_settings: 'Settings',
      btn_update_pay: 'Pay for update',
      update_banner: 'A new version is available.',
      btn_start: '▶ START POSTING',
      btn_pause: '⏸ PAUSE',
      btn_stop: '⏹ STOP',
      stat_line_posts: 'Posts today: {n}',
      stat_line_groups: 'Groups in your list: {n}',
      stat_line_next: 'Next post in: {t}',
      stat_line_rate: 'Successful posts: {p}',
      stat_next_na: '—',
      log_live: 'Recent activity:',
      status_running: 'Running',
      status_paused: 'Paused',
      status_stopped: 'Stopped',
      header_stopped_title: 'Stopped',
      header_stopped_sub: 'The bot is not posting',
      header_paused_title: 'Paused',
      header_paused_sub: 'Posting is temporarily paused',
      header_active_title: 'Active',
      header_active_sub: 'Posting to your groups',
      header_waiting_title: 'Waiting',
      header_waiting_sub: 'Next post in {t}',
      checklist_title: 'To publish you need:',
      checklist_fb: 'Facebook account connected',
      checklist_groups: 'Add at least 1 group',
      checklist_post: 'Add at least 1 active post',
      checklist_all_ready: '🚀 All set! You can start',
      toast_title: '✅ Posted successfully!',
      toast_groups_added: '✅ Added {n} groups to your list',
      toast_select_groups_first: '⚠️ Select at least one group first',
      preview_heading: '👁 Preview of your post',
      preview_sub: 'How it will look on Facebook',
      preview_meta: 'Public group · Now',
      preview_like: 'Like',
      preview_comment: 'Comment',
      preview_share: 'Share',
      preview_empty: '(Write your message in an active version)',
      preview_version_of: 'Version {x} of {y} active',
      preview_tab_v: 'V{n}',
      tooltip_when:
        'Set the hours when your bot will be active posting automatically',
      tooltip_frequency: 'Wait time between each round of posts in your groups',
      campaign_title: 'My Campaign',
      campaign_head_sub: 'Run your posting from one place',
      cq_section_title: 'Quick setup',
      cq_interval: 'How often to post?',
      cq_until: 'Until what time today?',
      cq_round: 'Groups per round?',
      cq_hour_short: 'h',
      btn_start_now: '▶ START POSTING NOW',
      btn_resume: '▶ RESUME',
      cap_posting: 'Bot is posting…',
      cap_paused: 'Posting paused',
      cap_in_group: 'Posting in: "{name}" ({i} of {n})',
      prog_ok: 'Posted in "{name}" ({i}/{n})',
      prog_skip: 'Skipped: "{name}" (no access)',
      prog_skip_marketplace: 'Skipped: "{name}" (buy/sell group)',
      prog_skip_pending: 'Skipped: "{name}" (membership pending)',
      prog_skip_already_today: 'Already posted today: "{name}"',
      prog_skip_already_recent:
        'Posted {ago} ago — next in {next}: "{name}"',
      prog_err: 'Error in "{name}"',
      prog_wait: 'Waiting {t} until next round',
      stat_posts_today: 'Posts today: {n}',
      stat_groups_reached: 'Groups reached: {n}',
      stat_next_round: 'Next round: {t}',
      stat_success_rate: 'Success rate: {p}',
      ready_groups_line: '✅ {n} groups ready',
      ready_versions_line: '✅ {n} post versions',
      ready_fb_line: '✅ Facebook connected',
      label_campaign_name: 'Campaign name',
      placeholder_campaign: 'Name your campaign (e.g. May promo)',
      welcome_title: '🚀 Ready to post?',
      welcome_sub: 'Set up in 3 steps:',
      welcome_step1: '✓ 1. Add your groups',
      welcome_step2: '✓ 2. Upload your post',
      welcome_step3: '✓ 3. Press START',
      btn_go_groups: 'Go to Groups',
      btn_go_content: 'Go to Content',
      groups_title: 'My Facebook Groups',
      groups_subtitle: 'Add the groups where you want to post',
      groups_how_title: 'How to add groups?',
      groups_how_opt1: 'Option 1: Search by topic 🔍',
      groups_how_opt2: 'Option 2: Paste the group link 🔗',
      btn_search_groups_big: '🔍 Search groups by topic',
      btn_add_by_link: '🔗 Add group by link',
      label_paste_links: 'Paste the group link here',
      placeholder_group_urls:
        'Paste your Facebook group link here\nE.g. https://www.facebook.com/groups/sales-nyc',
      btn_extract: 'Add to list',
      btn_search_groups: 'Search groups',
      btn_import: 'Import .txt',
      btn_export: 'Export list',
      groups_total_line: 'You have',
      groups_total_of: 'groups · Max',
      content_title: 'My Post',
      content_subtitle: 'Postrix will rotate versions so it does not look repetitive',
      content_lead:
        'You can have up to 4 versions of your post. The bot will alternate them automatically.',
      slot_version: 'Version {n}',
      slot_active: 'On',
      slot_inactive: 'Off',
      slot_msg_label: 'Your message:',
      slot_msg_placeholder: 'Write what you want to post in the groups…',
      slot_img_label: 'Your image:',
      slot_img_btn: '📷 Upload image',
      slot_img_hint: '(JPG, PNG · max 5MB)',
      slot_preview: 'Preview:',
      slot_no_image: 'No image',
      last_slot: 'Last version used',
      history_title: 'Post history',
      history_subtitle: 'Everything your bot has posted',
      hist_period_label: 'Period:',
      hist_result_label: 'Result:',
      hist_today: 'Today',
      hist_week: 'This week',
      hist_month: 'This month',
      hist_ok: '✅ Success',
      hist_err: '❌ Failed',
      hist_all: 'All',
      hist_summary_today: 'Today: {n} successful posts in {g} different groups 🎉',
      hist_summary_week: 'This week: {n} successful posts in {g} different groups 🎉',
      hist_summary_month: 'This month: {n} successful posts in {g} different groups 🎉',
      btn_export_csv: 'Export CSV',
      col_date: 'Date & time',
      col_group: 'Group',
      col_result: 'Result',
      col_members_col: 'Members',
      col_status: 'Status',
      hist_res_ok: '✅ Posted',
      hist_res_skipped_marketplace: '⏭ Skipped (buy/sell)',
      hist_res_skipped_pending: '⏭ Skipped (pending approval)',
      hist_res_skipped_already_today: '⏭ Already posted today',
      hist_res_skipped_already_recent:
        '⏭ Posted {ago} ago — next in {next}',
      hist_res_fail: '❌ Could not post',
      hist_res_reason: '❌ {reason}',
      group_status_active: '✅ Active',
      group_status_blocked: '❌ Unavailable',
      group_members_na: '—',
      fb_section_title: 'Your Facebook account',
      fb_section_sub: 'Connect the account you use to post in groups',
      fb_need_connect: '⚠️ Connect your account to post',
      fb_no_account: '⚠️ No account connected',
      fb_badge_connected: '✅ Connected',
      fb_connected_named: 'Connected as: {name}',
      fb_connected_generic: 'Facebook account connected',
      btn_connect_fb_big: '🔗 Connect my Facebook account',
      fb_connected_as: '✅ Connected as:',
      btn_fb_update_name: 'Update display name',
      btn_disconnect_fb: 'Disconnect',
      section_when: 'When to post?',
      section_frequency: 'How often to post?',
      rule_start: 'Start time',
      rule_end: 'End time',
      rule_interval: 'Base interval (min)',
      rule_var: 'Random ± (min)',
      rule_max_r: 'Max groups / round',
      rule_max_d: 'Max posts / day',
      notif_title: 'Notifications',
      notif_email: 'Alert email',
      btn_save: 'Save settings',
      modal_search_title: 'Search groups',
      btn_search: 'Search',
      btn_searching: 'Searching...',
      modal_search_status_loading:
        '🔍 Searching Facebook groups... This may take 15–30 seconds',
      modal_search_status_done: '✅ Search completed',
      modal_search_status_error: '❌ Search failed. Try again',
      progress_msg_0: 'Opening Facebook...',
      progress_msg_5: 'Searching groups for that keyword...',
      progress_msg_10: 'Filtering groups you belong to...',
      progress_msg_15: 'Checking each group type (compatible vs buy/sell)...',
      search_count_compatible: 'Found: {c} compatible groups',
      search_count_excluded_mp: '({m} buy/sell groups excluded)',
      search_count_verifying: '{v} verifying…',
      search_sec_compatible: 'Compatible groups',
      search_sec_marketplace: 'Buy/sell only',
      search_sec_verifying: 'Verifying…',
      badge_compatible: '✓ Compatible',
      badge_mp_only: '🛍 Buy/sell only',
      badge_verifying: '⏳ Verifying…',
      search_tooltip_mp:
        'This group only allows product listings, not free-form text posts',
      search_mp_note:
        '💡 Groups marked as buy/sell only do not allow free-text posts. Postrix excludes them automatically to avoid errors.',
      btn_close: 'Close',
      btn_add: 'Add',
      btn_add_selected: 'Add selected',
      col_group_name: 'Name',
      search_found: 'Found: {n} groups where you are a member',
      search_no_members_match:
        'We found no groups where you are a member with that keyword.\nTry another word such as:\nbuying, business, entrepreneurs',
      badge_member: '✓ Member',
      badge_pending: 'Pending',
      log_activation_ok: 'Your license is active.',
      log_bot_started: '▶ Posting started. The bot will follow your schedule.',
      log_bot_resumed: '▶ Posting resumed.',
      log_bot_paused: '⏸ Posting paused. You can resume anytime.',
      log_bot_stopped: '⏹ Posting stopped.',
      log_settings_saved: '✅ Settings saved.',
      log_group_removed: '🗑 Group removed from the list.',
      log_fb_connected: '✅ Facebook account connected.',
      log_fb_name_updated: '✅ Facebook display name updated.',
      log_fb_disconnected: 'Facebook account disconnected.',
      log_groups_added: '✅ Groups added to your list.',
      log_add_members_only: 'Select groups where you are already a member.',
      log_added_members: '✅ Groups added (members only).',
      toast_marketplace_skipped:
        'Skipped {n} buy/sell-only group(s) (no free-text posts).',
      toast_verify_marketplace_failed:
        'Could not verify groups. Try again or check your connection.',
      restriction_title: 'Facebook flagged unusual activity',
      restriction_body:
        'Your bot was automatically paused for 24 hours to protect your account.',
      restriction_until_line: 'Auto-resume: {dt}',
      hist_res_fb_restriction: '🚨 Facebook restriction (cooldown)',
    },
  };

  function t(key) {
    return (STR[lang] && STR[lang][key]) || key;
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (STR[lang][k]) el.textContent = STR[lang][k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (STR[lang][k]) el.setAttribute('placeholder', STR[lang][k]);
    });
  }

  /** Mensajes de actividad legibles (sin jerga técnica). */
  function logLine(msg) {
    const box = document.getElementById('live-log');
    if (!box) return;
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = msg;
    box.prepend(line);
    while (box.children.length > 20) box.removeChild(box.lastChild);
  }

  function setView(name) {
    const act = document.getElementById('view-activation');
    const dash = document.getElementById('view-dashboard');
    if (name === 'dashboard') {
      act.classList.add('hidden');
      act.classList.remove('fade-in');
      dash.classList.remove('hidden');
      void dash.offsetWidth;
      dash.classList.add('fade-in');
    } else {
      dash.classList.add('hidden');
      dash.classList.remove('fade-in');
      act.classList.remove('hidden');
      void act.offsetWidth;
      act.classList.add('fade-in');
    }
  }

  /** Sesión Facebook válida (misma lógica que la tarjeta de conexión). */
  function isFacebookConnected(st) {
    const cookies = st?.fb_session_cookies;
    const hasCookieStore = typeof cookies === 'string' && cookies.length > 10;
    const acc = (st.facebookAccounts || []).find(
      (a) => a.id === (st.activeAccountId || 'default')
    );
    const hasAccountCookies = !!(acc?.cookies && String(acc.cookies).length > 10);
    return hasCookieStore || hasAccountCookies;
  }

  /** Indicador del header: colores, subtexto y pulso según el scheduler real. */
  async function updateHeaderPill(botState) {
    const pill = document.getElementById('bot-status-pill');
    const titleEl = document.getElementById('bot-status-text');
    const subEl = document.getElementById('bot-status-sub');
    const dot = pill?.querySelector('.status-dot');
    if (!pill || !titleEl || !subEl || !dot) return;

    const st = botState || (await api.botState());
    dot.classList.remove('active');
    pill.className = 'status-pill';

    if (!st.running) {
      pill.classList.add('status-pill--stopped');
      titleEl.textContent = t('header_stopped_title');
      subEl.textContent = t('header_stopped_sub');
      return;
    }
    if (st.paused) {
      pill.classList.add('status-pill--paused');
      titleEl.textContent = t('header_paused_title');
      subEl.textContent = t('header_paused_sub');
      return;
    }
    if (st.nextRunAt) {
      pill.classList.add('status-pill--waiting');
      const target = new Date(st.nextRunAt).getTime();
      const diff = Math.max(0, target - Date.now());
      const timeStr = formatNextRunMs(diff);
      titleEl.textContent = t('header_waiting_title');
      subEl.textContent = t('header_waiting_sub').replace('{t}', timeStr);
      return;
    }
    pill.classList.add('status-pill--active');
    dot.classList.add('active');
    titleEl.textContent = t('header_active_title');
    subEl.textContent = t('header_active_sub');
  }

  /** Compatibilidad con código que aún llama setBotStatus tras botón. */
  function setBotStatus() {
    void updateHeaderPill();
  }

  /** Clave del último historial ya mostrada en toast (evita duplicados). */
  let lastHistoryToastKey = '';

  function canStartCampaign(data) {
    if (!isFacebookConnected(data)) return false;
    if (!(data.groups || []).length) return false;
    const slots = data.contentSlots || [];
    return slots.some(
      (s) => s.active && String(s.text || '').trim().length > 0
    );
  }

  /** Resumen de requisitos bajo el botón INICIAR (solo cuando el scheduler está parado). */
  function updateCampaignChecklist(data, botSt) {
    const itemsEl = document.getElementById('campaign-ready-summary');
    const readyEl = document.getElementById('campaign-ready-ready');
    const startBtn = document.getElementById('btn-bot-start');
    if (!itemsEl) return;

    const fbOk = isFacebookConnected(data);
    const groupsOk = (data.groups || []).length >= 1;
    const slots = data.contentSlots || [];
    const postOk = slots.some(
      (s) => s.active && String(s.text || '').trim().length > 0
    );
    const allOk = fbOk && groupsOk && postOk;

    const nGroups = (data.groups || []).length;
    const nVers = slots.filter(
      (s) => s.active && String(s.text || '').trim().length > 0
    ).length;

    const rows = [
      {
        ok: groupsOk,
        label: t('ready_groups_line').replace('{n}', String(nGroups)),
      },
      {
        ok: postOk,
        label: t('ready_versions_line').replace('{n}', String(nVers)),
      },
      { ok: fbOk, label: t('ready_fb_line') },
    ];
    itemsEl.innerHTML = rows
      .map(
        (r) =>
          `<li class="${r.ok ? 'is-done' : ''}"><span>${r.ok ? '✅' : '❌'}</span> ${escapeHtml(r.label)}</li>`
      )
      .join('');

    if (readyEl) readyEl.classList.toggle('hidden', !allOk);

    const restrictionActive = !!botSt.restrictionActive;

    if (startBtn) {
      if (restrictionActive) {
        startBtn.disabled = true;
        startBtn.classList.add('btn-start-disabled');
      } else if (!botSt.running) {
        startBtn.disabled = !allOk;
        startBtn.classList.toggle('btn-start-disabled', !allOk);
      } else {
        startBtn.disabled = false;
        startBtn.classList.remove('btn-start-disabled');
      }
    }

    const resumeBtn = document.getElementById('btn-bot-resume');
    if (resumeBtn) {
      resumeBtn.disabled = restrictionActive;
      resumeBtn.classList.toggle('btn-start-disabled', restrictionActive);
    }
  }

  /** Banner rojo/naranja: restricción de Facebook activa (store + estado del scheduler). */
  function updateRestrictionBanner(botSt) {
    const wrap = document.getElementById('restriction-alert');
    const timerEl = document.getElementById('restriction-timer');
    const titleEl = wrap?.querySelector('[data-i18n="restriction_title"]');
    const bodyEl = wrap?.querySelector('[data-i18n="restriction_body"]');
    if (!wrap || !timerEl) return;
    if (titleEl) titleEl.textContent = t('restriction_title');
    if (bodyEl) bodyEl.textContent = t('restriction_body');
    const active = !!botSt.restrictionActive;
    wrap.classList.toggle('hidden', !active);
    if (active && botSt.restrictionUntil) {
      const d = new Date(Number(botSt.restrictionUntil));
      const dt = d.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      timerEl.textContent = t('restriction_until_line').replace('{dt}', dt);
    }
  }

  /** Paneles detenido / activo + botones pausa vs reanudar. */
  function syncCampaignPanels(botSt) {
    const stopped = document.getElementById('campaign-panel-stopped');
    const active = document.getElementById('campaign-panel-active');
    if (!stopped || !active) return;
    const showStopped = !botSt.running;
    stopped.classList.toggle('hidden', !showStopped);
    active.classList.toggle('hidden', showStopped);

    if (showStopped) {
      const bar = document.getElementById('campaign-round-progress-bar');
      const detail = document.getElementById('campaign-active-detail');
      if (bar) bar.style.width = '0%';
      if (detail) detail.textContent = '';
    }

    const titleEl = document.getElementById('campaign-active-title');
    if (titleEl && botSt.running) {
      if (botSt.paused) {
        titleEl.textContent = `⏸ ${t('cap_paused')}`;
      } else {
        titleEl.textContent = `🟢 ${t('cap_posting')}`;
      }
    }

    const pauseBtn = document.getElementById('btn-bot-pause');
    const resumeBtn = document.getElementById('btn-bot-resume');
    if (pauseBtn && resumeBtn) {
      const restricted = !!botSt.restrictionActive;
      const running = botSt.running && !botSt.paused && !restricted;
      const paused = botSt.running && botSt.paused;
      pauseBtn.classList.toggle('hidden', !running);
      resumeBtn.classList.toggle('hidden', !paused || restricted);
    }
  }

  /** Sincroniza chips de configuración rápida con campaign.session. */
  function syncCampaignQuickFromStore(data) {
    const s = data.campaign?.session || {};
    const rules = data.rules || {};
    const ih = s.intervalHours != null ? Number(s.intervalHours) : 3;
    document.querySelectorAll('.pick-chip[data-cq="interval"]').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-value')) === ih);
    });
    const gMax = s.maxGroupsPerRound != null ? Number(s.maxGroupsPerRound) : 20;
    document.querySelectorAll('.pick-chip[data-cq="groups"]').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-value')) === gMax);
    });
    // Hora fin: sesión > rules > defecto 19:00 (inicio del día por defecto 09:00 solo en store/rules)
    const he = s.hourEnd || rules.hourEnd || '19:00';
    const timeEl = document.getElementById('cq-hour-end');
    if (timeEl) timeEl.value = he.length >= 4 ? he.slice(0, 5) : '19:00';
  }

  async function saveCampaignSession(partial) {
    const prev = await api.settingsGet();
    await api.settingsSet({
      campaign: {
        ...(prev.campaign || {}),
        session: { ...(prev.campaign?.session || {}), ...partial },
      },
    });
  }

  function formatDelayMs(ms) {
    if (ms == null || Number.isNaN(ms)) return '—';
    const totalM = Math.max(0, Math.floor(ms / 60000));
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    if (lang === 'es') {
      if (h > 0) return `${h}h ${m}min`;
      return `${m} min`;
    }
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }

  /** Grupos distintos con publicación OK hoy (historial). */
  function countUniqueGroupsToday(history) {
    const today = new Date().toISOString().slice(0, 10);
    const set = new Set();
    (history || []).forEach((h) => {
      if (!h.at || !h.at.startsWith(today)) return;
      if (h.result === 'ok' && h.groupId) set.add(String(h.groupId));
    });
    return set.size;
  }

  /** Texto "Xh Ymin" / "Y min" para intervalos de saltos recientes (scheduler). */
  function formatRecentIntervalParts(h, m, shortMinLabel) {
    const hh = Math.max(0, Number(h) || 0);
    const mm = Math.max(0, Number(m) || 0);
    if (hh > 0) return `${hh}h ${mm}min`;
    return `${mm}${shortMinLabel ? shortMinLabel : ' min'}`;
  }

  /** Línea amigable en el log de campaña según evento del proceso principal. */
  function appendCampaignProgressLog(ev) {
    const box = document.getElementById('live-log');
    if (!box) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    let cls = 'cq-success';
    let text = '';
    const name = String(ev.groupName || '').replace(/"/g, '');
    if (ev.status === 'success') {
      cls = 'cq-success';
      text = `✅ ${timeStr} — ${t('prog_ok')
        .replace('{name}', name)
        .replace('{i}', String(ev.groupIndex))
        .replace('{n}', String(ev.totalGroups))}`;
    } else if (ev.status === 'skipped') {
      // Compraventa: naranja; solicitud pendiente u otros saltos: amarillo (no error rojo)
      const marketplaceSkip =
        ev.skipDetail === 'marketplace' ||
        ev.reason === 'marketplace_only_group' ||
        ev.reason === 'buy_sell_group_no_text_post';
      const pendingSkip =
        ev.skipDetail === 'pending' || ev.reason === 'pending_approval';
      const alreadyTodaySkip =
        ev.skipDetail === 'already_posted_today' || ev.reason === 'already_posted_today';
      const alreadyRecentSkip =
        ev.skipDetail === 'already_posted_recently' ||
        ev.reason === 'already_posted_recently';
      if (marketplaceSkip) {
        cls = 'cq-skip-marketplace';
        text = `⏭ ${timeStr} — ${t('prog_skip_marketplace').replace('{name}', name)}`;
      } else if (alreadyRecentSkip) {
        const ago = formatRecentIntervalParts(ev.recentAgoH, ev.recentAgoM, lang === 'es' ? ' min' : ' min');
        const next = formatRecentIntervalParts(ev.recentNextH, ev.recentNextM, lang === 'es' ? ' min' : ' min');
        cls = 'cq-skip-today';
        text = `⏭ ${timeStr} — ${t('prog_skip_already_recent')
          .replace('{ago}', ago)
          .replace('{next}', next)
          .replace('{name}', name)}`;
      } else if (alreadyTodaySkip) {
        cls = 'cq-skip-today';
        text = `⏭ ${timeStr} — ${t('prog_skip_already_today').replace('{name}', name)}`;
      } else if (pendingSkip) {
        cls = 'cq-skip';
        text = `⏭ ${timeStr} — ${t('prog_skip_pending').replace('{name}', name)}`;
      } else {
        cls = 'cq-skip';
        text = `⏭ ${timeStr} — ${t('prog_skip').replace('{name}', name)}`;
      }
    } else if (ev.status === 'error') {
      cls = 'cq-err';
      text = `❌ ${timeStr} — ${t('prog_err').replace('{name}', name)}`;
    } else if (ev.status === 'waiting') {
      cls = 'cq-wait';
      text = `⏰ ${timeStr} — ${t('prog_wait').replace('{t}', formatDelayMs(ev.nextDelayMs))}`;
    } else {
      return;
    }
    const line = document.createElement('div');
    line.className = `log-line ${cls}`;
    line.textContent = text;
    box.insertBefore(line, box.firstChild);
    while (box.children.length > 80) box.removeChild(box.lastChild);
  }

  /** Toast si hay una nueva entrada OK en el historial (no en la primera hidratación). */
  function maybeToastNewPost(data) {
    const h0 = (data.history || [])[0];
    if (!h0 || h0.result !== 'ok') return;
    const key = `${h0.at}|${h0.groupId}`;
    if (key === lastHistoryToastKey) return;
    const hadKey = lastHistoryToastKey !== '';
    lastHistoryToastKey = key;
    if (!hadKey) return;

    const postsToday = data.stats?.postsToday ?? 0;
    const total = (data.groups || []).length;
    showPostSuccessToast(h0.groupName || h0.groupId, postsToday, total);
  }

  /** Notificación verde apilada arriba a la derecha. */
  function showPostSuccessToast(groupName, current, total) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast-notification';
    const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    el.innerHTML = `
      <div class="toast-title">${escapeHtml(t('toast_title'))}</div>
      <div class="toast-group">${escapeHtml(String(groupName))}</div>
      <div class="toast-bar-outer"><div class="toast-bar-inner" style="width:${pct}%"></div></div>
      <div class="toast-meta">${current}/${total}</div>`;
    stack.insertBefore(el, stack.firstChild);
    setTimeout(() => {
      el.classList.add('toast-notification--out');
      setTimeout(() => el.remove(), 350);
    }, 2700);
  }

  /** Toast verde simple (grupos añadidos desde el modal). */
  function showToastGroupsAdded(n) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast-notification';
    el.innerHTML = `<div class="toast-title">${escapeHtml(
      t('toast_groups_added').replace('{n}', String(n))
    )}</div>`;
    stack.insertBefore(el, stack.firstChild);
    setTimeout(() => {
      el.classList.add('toast-notification--out');
      setTimeout(() => el.remove(), 350);
    }, 2700);
  }

  /** Toast de aviso (p. ej. sin grupos seleccionados). */
  function showToastWarning(message) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast-notification toast-notification--warn';
    el.innerHTML = `<div class="toast-title">${escapeHtml(message)}</div>`;
    stack.insertBefore(el, stack.firstChild);
    setTimeout(() => {
      el.classList.add('toast-notification--out');
      setTimeout(() => el.remove(), 350);
    }, 2500);
  }

  function fileUrlFromPath(p) {
    if (!p || typeof p !== 'string') return '';
    const norm = p.replace(/\\/g, '/');
    const prefix = /^[A-Za-z]:/.test(norm) ? '/' : '';
    try {
      return 'file://' + prefix + encodeURI(norm).replace(/#/g, '%23');
    } catch {
      return '';
    }
  }

  function pickPreviewSlot(slots) {
    const s = slots || [];
    const withActive = s.find(
      (x) => x.active && String(x.text || '').trim().length > 0
    );
    if (withActive) return withActive;
    const anyText = s.find((x) => String(x.text || '').trim().length > 0);
    if (anyText) return anyText;
    return s[0] || {};
  }

  /** Índices 0..3 de slots marcados como activos. */
  function getActiveSlotIndices(slots) {
    const s = slots || [];
    return s.map((x, i) => (x && x.active ? i : -1)).filter((i) => i >= 0);
  }

  /** Qué slot muestra la vista previa general (solo entre versiones activas). */
  let fbPreviewSlotIndex = null;

  function initialsFromName(name) {
    const p = String(name || '?')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  }

  /** Pinta la tarjeta tipo Facebook; tabs solo si hay versiones activas. */
  function renderFbPreview(slots, data) {
    const s = slots || [];
    const activeIdxs = getActiveSlotIndices(s);
    const tabsWrap = document.getElementById('fb-preview-tabs-wrap');
    const tabsEl = document.getElementById('fb-preview-tabs');
    const verLabel = document.getElementById('fb-preview-version-label');

    let slot;
    if (activeIdxs.length === 0) {
      fbPreviewSlotIndex = null;
      if (tabsWrap) tabsWrap.classList.add('hidden');
      slot = pickPreviewSlot(s);
    } else {
      if (tabsWrap) tabsWrap.classList.remove('hidden');
      if (fbPreviewSlotIndex === null || !activeIdxs.includes(fbPreviewSlotIndex)) {
        fbPreviewSlotIndex = activeIdxs[0];
      }
      const pos = activeIdxs.indexOf(fbPreviewSlotIndex) + 1;
      if (verLabel) {
        verLabel.textContent = t('preview_version_of')
          .replace('{x}', String(pos))
          .replace('{y}', String(activeIdxs.length));
      }
      if (tabsEl) {
        tabsEl.innerHTML = '';
        activeIdxs.forEach((idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('role', 'tab');
          btn.className =
            'chip fb-preview-tab' + (idx === fbPreviewSlotIndex ? ' active' : '');
          btn.textContent = t('preview_tab_v').replace('{n}', String(idx + 1));
          // Sincronizar texto desde el DOM y luego mostrar esta versión
          btn.onclick = () => {
            fbPreviewSlotIndex = idx;
            void updatePublicationPreviewFromDom();
          };
          tabsEl.appendChild(btn);
        });
      }
      slot = s[fbPreviewSlotIndex] || {};
    }

    const name =
      data.fb_user_name ||
      (data.facebookAccounts || []).find(
        (a) => a.id === (data.activeAccountId || 'default')
      )?.name ||
      (lang === 'es' ? 'Tu perfil' : 'Your profile');
    const avatar = document.getElementById('fb-preview-avatar');
    const nameEl = document.getElementById('fb-preview-name');
    const textEl = document.getElementById('fb-preview-text');
    const imgWrap = document.getElementById('fb-preview-image-wrap');
    const img = document.getElementById('fb-preview-image');
    const ph = document.getElementById('fb-preview-placeholder');
    if (!avatar || !nameEl || !textEl || !imgWrap || !img || !ph) return;

    nameEl.textContent = name;
    avatar.textContent = initialsFromName(name);

    const txt = String(slot.text || '').trim();
    textEl.textContent = txt || t('preview_empty');
    textEl.classList.toggle('muted', !txt);

    const path = slot.imagePath;
    if (path) {
      const showImg = () => {
        imgWrap.classList.remove('hidden');
        ph.classList.add('hidden');
      };
      const hideImg = () => {
        imgWrap.classList.add('hidden');
        ph.classList.remove('hidden');
      };
      img.onload = showImg;
      img.onerror = hideImg;
      img.src = fileUrlFromPath(path);
      if (img.complete && img.naturalHeight > 0) showImg();
    } else {
      img.removeAttribute('src');
      imgWrap.classList.add('hidden');
      ph.classList.remove('hidden');
    }
  }

  async function updatePublicationPreview() {
    const data = await api.settingsGet();
    renderFbPreview(data.contentSlots || [], data);
  }

  /** Vista previa mientras se edita sin guardar aún. */
  async function updatePublicationPreviewFromDom() {
    const data = await api.settingsGet();
    const base = [...(data.contentSlots || [])];
    document.querySelectorAll('.content-slot').forEach((row, i) => {
      const text = row.querySelector('.slot-text')?.value ?? '';
      const active = row.querySelector('.slot-active')?.checked ?? false;
      base[i] = { ...(base[i] || {}), id: String(i + 1), text, active };
    });
    renderFbPreview(base, data);
  }

  /** Formato amigable para “próxima publicación” (ej. 2h 45min). */
  function formatNextRunMs(diffMs) {
    if (diffMs <= 0) return t('stat_next_na');
    const totalM = Math.floor(diffMs / 60000);
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    const s = Math.floor((diffMs % 60000) / 1000);
    if (lang === 'es') {
      if (h > 0) return `${h}h ${m}min`;
      if (totalM > 0) return `${m} min ${s}s`;
      return `${s}s`;
    }
    if (h > 0) return `${h}h ${m}m`;
    if (totalM > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  /** Muestra u oculta la tarjeta de bienvenida (solo campaña detenida). */
  async function updateCampaignWelcomeCard() {
    const card = document.getElementById('campaign-welcome');
    if (!card) return;
    const data = await api.settingsGet();
    const status = data.campaign?.status || 'stopped';
    card.classList.toggle('hidden', status !== 'stopped');
  }

  async function refreshStats() {
    const data = await api.settingsGet();
    const groups = data.groups || [];
    const stats = data.stats || {};
    const posts = stats.postsToday || 0;
    const rate =
      stats.successRate != null ? `${stats.successRate}%` : t('stat_next_na');

    const lp = document.getElementById('stat-line-posts');
    const lg = document.getElementById('stat-line-groups-reached');
    const ln = document.getElementById('stat-line-next');
    const lr = document.getElementById('stat-line-rate');
    const reached = countUniqueGroupsToday(data.history || []);
    if (lp) lp.textContent = t('stat_posts_today').replace('{n}', String(posts));
    if (lg) lg.textContent = t('stat_groups_reached').replace('{n}', String(reached));
    if (lr) lr.textContent = t('stat_success_rate').replace('{p}', rate);

    const lastSlot = document.getElementById('last-slot');
    if (lastSlot) lastSlot.textContent = data.lastSlotUsed || '—';

    const st = await api.botState();
    let nextTxt = t('stat_next_na');
    if (st.nextRunAt) {
      const target = new Date(st.nextRunAt).getTime();
      const diff = Math.max(0, target - Date.now());
      nextTxt = formatNextRunMs(diff);
    }
    if (ln) ln.textContent = t('stat_next_round').replace('{t}', nextTxt);

    await updateHeaderPill(st);
    updateRestrictionBanner(st);
    updateCampaignChecklist(data, st);
    syncCampaignPanels(st);
    maybeToastNewPost(data);

    await updateCampaignWelcomeCard();
  }

  /** Texto de miembros para la tabla (dato opcional al buscar en Facebook). */
  function formatGroupMembersCell(g) {
    if (g.members && String(g.members).trim()) return escapeHtml(String(g.members).trim());
    return t('group_members_na');
  }

  /** Etiqueta de estado de publicación en el grupo. */
  function formatGroupStatusCell(g) {
    if (g.status === 'blocked') return `<span class="badge badge-group-off">${escapeHtml(t('group_status_blocked'))}</span>`;
    return `<span class="badge badge-group-on">${escapeHtml(t('group_status_active'))}</span>`;
  }

  function renderGroupsList(groups) {
    const el = document.getElementById('groups-list');
    el.innerHTML = '';
    const n = groups.length;
    document.getElementById('groups-count').textContent = String(n);
    const pct = Math.min(100, Math.round((n / 80) * 100));
    const bar = document.getElementById('groups-progress-bar');
    if (bar) bar.style.width = `${pct}%`;

    const head = document.getElementById('groups-list-head');
    if (head) head.classList.toggle('hidden', n === 0);

    groups.forEach((g, idx) => {
      const row = document.createElement('div');
      row.className = 'group-row';
      row.innerHTML = `
        <div class="group-meta">
          <div class="group-name">${escapeHtml(g.name || '')}</div>
          <div class="group-id muted">${escapeHtml(g.id)}</div>
        </div>
        <div class="group-members-col">${formatGroupMembersCell(g)}</div>
        <div class="group-status-col">${formatGroupStatusCell(g)}</div>
        <button class="btn btn-ghost btn-sm" data-idx="${idx}" type="button" aria-label="Eliminar">✕</button>`;
      row.querySelector('button').onclick = async () => {
        const next = groups.filter((_, i) => i !== idx);
        await api.groupsSave(next);
        renderGroupsList(await api.groupsList());
        logLine(t('log_group_removed'));
      };
      el.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Resultados crudos de la última búsqueda (incluye isMember). */
  let lastGroupSearchResults = [];

  /** True si la última llamada a búsqueda terminó sin error (para mensaje vacío). */
  let modalSearchLastOk = false;

  /** Evita clics duplicados mientras `groupsSearch` está en curso. */
  let isSearching = false;

  /** Temporizadores de la barra falsa y los mensajes rotativos. */
  let modalSearchTimers = { progress: null, messages: null };

  function clearModalSearchTimers() {
    if (modalSearchTimers.progress != null) {
      clearInterval(modalSearchTimers.progress);
      modalSearchTimers.progress = null;
    }
    if (modalSearchTimers.messages != null) {
      clearInterval(modalSearchTimers.messages);
      modalSearchTimers.messages = null;
    }
  }

  /**
   * Modal búsqueda: secciones compatibles / compraventa / verificando; contador y nota explicativa.
   */
  function renderSearchModalResults() {
    const box = document.getElementById('modal-search-results');
    const countEl = document.getElementById('modal-search-count');
    const noteEl = document.getElementById('modal-search-marketplace-note');
    if (!box || !countEl) return;

    const all = lastGroupSearchResults || [];
    const visible = all
      .filter((g) => g.isMember)
      .map((g) => ({
        ...g,
        groupType: g.groupType || 'verifying',
      }));
    const compat = visible.filter((g) => g.groupType === 'compatible');
    const marketplace = visible.filter((g) => g.groupType === 'marketplace');
    const verifying = visible.filter((g) => g.groupType === 'verifying');

    const showSearchStats = modalSearchLastOk || isSearching;
    if (showSearchStats) {
      let line = t('search_count_compatible').replace('{c}', String(compat.length));
      if (marketplace.length > 0) {
        line += ` ${t('search_count_excluded_mp').replace('{m}', String(marketplace.length))}`;
      }
      if (verifying.length > 0) {
        line += ` · ${t('search_count_verifying').replace('{v}', String(verifying.length))}`;
      }
      countEl.textContent = line;
    } else {
      countEl.textContent = '';
    }

    if (noteEl) {
      if (marketplace.length > 0 && showSearchStats) {
        noteEl.textContent = t('search_mp_note');
        noteEl.classList.remove('hidden');
      } else {
        noteEl.textContent = '';
        noteEl.classList.add('hidden');
      }
    }

    box.innerHTML = '';

    if (modalSearchLastOk && visible.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'modal-search-empty muted';
      empty.style.whiteSpace = 'pre-line';
      empty.style.lineHeight = '1.45';
      empty.textContent = t('search_no_members_match');
      box.appendChild(empty);
      return;
    }

    if (visible.length === 0) {
      return;
    }

    function appendSection(titleKey, list, kind) {
      if (!list.length) return;
      const head = document.createElement('div');
      head.className = 'modal-search-section-title muted';
      head.textContent = t(titleKey);
      box.appendChild(head);

      list.forEach((g) => {
        const wrap = document.createElement('div');
        wrap.className = `modal-search-row modal-search-row--${kind}`;
        const membersHtml = g.members
          ? `<div class="modal-search-members muted">${escapeHtml(g.members)}</div>`
          : '';

        let cbDisabled = '';
        let cbChecked = 'checked';
        let badgeClass = 'badge-compatible';
        let badgeText = t('badge_compatible');
        if (kind === 'marketplace') {
          cbDisabled = 'disabled';
          cbChecked = '';
          badgeClass = 'badge-mp-only';
          badgeText = t('badge_mp_only');
          wrap.title = t('search_tooltip_mp');
        } else if (kind === 'verifying') {
          cbDisabled = 'disabled';
          cbChecked = '';
          badgeClass = 'badge-verifying';
          badgeText = t('badge_verifying');
        }

        wrap.innerHTML = `
      <input type="checkbox" class="modal-search-cb" data-id="${escapeHtml(String(g.id))}" ${cbChecked} ${cbDisabled} />
      <div class="modal-search-row-main">
        <div class="modal-search-title">${escapeHtml(g.name)} <small>${escapeHtml(String(g.id))}</small></div>
        ${membersHtml}
      </div>
      <div class="modal-search-badges">
        <span class="badge badge-member">${escapeHtml(t('badge_member'))}</span>
        <span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>
      </div>`;
        box.appendChild(wrap);
      });
    }

    appendSection('search_sec_compatible', compat, 'compatible');
    appendSection('search_sec_marketplace', marketplace, 'marketplace');
    appendSection('search_sec_verifying', verifying, 'verifying');
  }

  api.onGroupsSearchProgress((data) => {
    if (!data?.groups) return;
    lastGroupSearchResults = data.groups;
    const m = document.getElementById('modal-search');
    if (m && !m.classList.contains('hidden')) {
      renderSearchModalResults();
    }
  });

  function renderContentSlots(slots) {
    const wrap = document.getElementById('content-slots');
    wrap.innerHTML = '';
    (slots || []).forEach((slot, i) => {
      const div = document.createElement('div');
      div.className = 'content-slot card-elevated' + (slot.active ? '' : ' inactive');
      const ver = t('slot_version').replace('{n}', String(i + 1));
      const activeLabel = slot.active ? t('slot_active') : t('slot_inactive');
      const noImgLabel = escapeHtml(t('slot_no_image'));
      div.innerHTML = `
        <div class="slot-head">
          <strong>${escapeHtml(ver)}</strong>
          <label class="slot-toggle"><input type="checkbox" class="slot-active" ${slot.active ? 'checked' : ''}/> <span class="slot-toggle-text">${escapeHtml(activeLabel)}</span></label>
        </div>
        <p class="slot-field-label">${escapeHtml(t('slot_msg_label'))}</p>
        <textarea class="textarea slot-text" rows="5" placeholder="${escapeHtml(t('slot_msg_placeholder'))}">${escapeHtml(slot.text || '')}</textarea>
        <p class="slot-field-label">${escapeHtml(t('slot_img_label'))}</p>
        <div class="row-btns slot-img-row">
          <button type="button" class="btn btn-secondary btn-pick">${escapeHtml(t('slot_img_btn'))}</button>
          <span class="muted slot-img-hint">${escapeHtml(t('slot_img_hint'))}</span>
        </div>
        <div class="slot-preview-wrap">
          <span class="muted slot-preview-label">${escapeHtml(t('slot_preview'))}</span>
          <div class="slot-thumb-box">
            <img class="slot-thumb-img hidden" alt="" />
            <div class="slot-thumb-placeholder">
              <span aria-hidden="true">📷</span>
              <span>${noImgLabel}</span>
            </div>
          </div>
        </div>
      `;
      const ta = div.querySelector('.slot-text');
      const chk = div.querySelector('.slot-active');
      const btnPick = div.querySelector('.btn-pick');
      const thumbImg = div.querySelector('.slot-thumb-img');
      const thumbPh = div.querySelector('.slot-thumb-placeholder');

      /** Miniatura local vía file:// (Electron). */
      function applySlotThumb(path) {
        if (!thumbImg || !thumbPh) return;
        if (!path) {
          thumbImg.classList.add('hidden');
          thumbPh.classList.remove('hidden');
          thumbImg.removeAttribute('src');
          return;
        }
        const show = () => {
          thumbImg.classList.remove('hidden');
          thumbPh.classList.add('hidden');
        };
        const hide = () => {
          thumbImg.classList.add('hidden');
          thumbPh.classList.remove('hidden');
        };
        thumbImg.onload = show;
        thumbImg.onerror = hide;
        thumbImg.src = fileUrlFromPath(path);
        if (thumbImg.complete && thumbImg.naturalHeight > 0) show();
      }
      applySlotThumb(slot.imagePath);

      ta.onchange = () => saveSlots();
      ta.oninput = () => updatePublicationPreviewFromDom();
      chk.onchange = () => saveSlots();
      btnPick.onclick = async () => {
        const p = await api.selectImage();
        if (p) {
          const data = await api.settingsGet();
          const list = [...(data.contentSlots || [])];
          list[i] = { ...(list[i] || {}), imagePath: p, id: String(i + 1) };
          await api.settingsSet({ contentSlots: list });
          renderContentSlots((await api.settingsGet()).contentSlots);
        }
      };
      wrap.appendChild(div);
    });
    void updatePublicationPreview();
  }

  async function saveSlots() {
    const wrap = document.getElementById('content-slots');
    const prev = (await api.settingsGet()).contentSlots || [];
    const rows = wrap.querySelectorAll('.content-slot');
    const next = [];
    rows.forEach((row, i) => {
      const text = row.querySelector('.slot-text').value;
      const active = row.querySelector('.slot-active').checked;
      next.push({
        ...(prev[i] || {}),
        id: String(i + 1),
        text,
        active,
        imagePath: (prev[i] && prev[i].imagePath) || '',
      });
    });
    await api.settingsSet({ contentSlots: next });
    await updatePublicationPreview();
  }

  function startOfDayTs(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function startOfWeekMondayTs(d) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function startOfMonthTs(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }

  /** ¿La fila del historial cae en el período (hoy / semana / mes)? */
  function historyRowInPeriod(r, period) {
    if (!r.at) return false;
    const ts = new Date(r.at).getTime();
    const now = Date.now();
    if (ts > now) return false;
    if (period === 'today') return ts >= startOfDayTs(new Date());
    if (period === 'week') return ts >= startOfWeekMondayTs(new Date());
    if (period === 'month') return ts >= startOfMonthTs(new Date());
    return true;
  }

  function formatHistoryWhen(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const locale = lang === 'es' ? 'es-MX' : 'en-US';
    const timePart = d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
    if (isToday) {
      return lang === 'es' ? `Hoy ${timePart}` : `Today ${timePart}`;
    }
    return d.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
  }

  /** Texto amigable para la columna resultado. */
  function formatHistoryResultCell(r) {
    if (r.result === 'ok') return t('hist_res_ok');
    if (r.result === 'skipped_marketplace') return t('hist_res_skipped_marketplace');
    if (r.result === 'skipped_pending') return t('hist_res_skipped_pending');
    if (r.result === 'skipped_already_today') return t('hist_res_skipped_already_today');
    if (r.result === 'skipped_already_recent') {
      const ago = formatRecentIntervalParts(r.recentAgoH, r.recentAgoM, lang === 'es' ? ' min' : ' min');
      const next = formatRecentIntervalParts(r.recentNextH, r.recentNextM, lang === 'es' ? ' min' : ' min');
      return t('hist_res_skipped_already_recent').replace('{ago}', ago).replace('{next}', next);
    }
    if (r.result === 'facebook_restriction') return t('hist_res_fb_restriction');
    const reason = String(r.result || 'error');
    const mapEs = {
      timeout: 'Tiempo agotado',
      captcha: 'Verificación de seguridad',
      no_permission: 'Sin permiso para publicar',
      group_not_found: 'Grupo no disponible',
    };
    const mapEn = {
      timeout: 'Timed out',
      captcha: 'Security check',
      no_permission: 'No permission to post',
      group_not_found: 'Group unavailable',
    };
    const m = lang === 'es' ? mapEs : mapEn;
    const friendly = m[reason] || reason;
    return t('hist_res_reason').replace('{reason}', friendly);
  }

  /** Resumen de exitosas en el período (sin filtrar por resultado). */
  function updateHistorySummary(rows, period) {
    const el = document.getElementById('history-summary');
    if (!el) return;
    const inPeriod = (rows || []).filter((r) => historyRowInPeriod(r, period));
    const okRows = inPeriod.filter((r) => r.result === 'ok');
    const unique = new Set(
      okRows.map((r) => r.groupName || r.groupId).filter(Boolean)
    );
    const key =
      period === 'today'
        ? 'hist_summary_today'
        : period === 'month'
          ? 'hist_summary_month'
          : 'hist_summary_week';
    el.textContent = t(key)
      .replace('{n}', String(okRows.length))
      .replace('{g}', String(unique.size));
  }

  function getHistoryPeriod() {
    const b = document.querySelector('.hist-period-btn.active');
    return b?.getAttribute('data-period') || 'week';
  }

  function getHistoryResultFilter() {
    const b = document.querySelector('.hist-result-btn.active');
    return b?.getAttribute('data-result') || 'all';
  }

  /**
   * Historial con chips de período y resultado (sin cambiar cómo se guardan los datos).
   */
  function renderHistory(rows) {
    const body = document.getElementById('history-body');
    if (!body) return;
    body.innerHTML = '';
    const period = getHistoryPeriod();
    const filterRes = getHistoryResultFilter();

    let list = (rows || []).filter((r) => historyRowInPeriod(r, period));
    if (filterRes === 'ok') list = list.filter((r) => r.result === 'ok');
    // Saltados por compraventa no son fallos de publicación
    if (filterRes === 'error')
      list = list.filter(
        (r) =>
          r.result !== 'ok' &&
          r.result !== 'skipped_marketplace' &&
          r.result !== 'skipped_pending' &&
          r.result !== 'skipped_already_today' &&
          r.result !== 'skipped_already_recent' &&
          r.result !== 'facebook_restriction'
      );

    updateHistorySummary(rows, period);

    list.slice(0, 200).forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(formatHistoryWhen(r.at))}</td><td>${escapeHtml(r.groupName || r.groupId)}</td><td>${escapeHtml(formatHistoryResultCell(r))}</td>`;
      body.appendChild(tr);
    });
  }

  async function refreshHistoryView() {
    const data = await api.settingsGet();
    renderHistory(data.history || []);
  }

  async function loadSettingsForm() {
    const data = await api.settingsGet();
    document.getElementById('notif-email').value = data.notifications?.alertEmail || '';
    document.getElementById('campaign-name').value = data.campaign?.name || '';
  }

  async function saveRulesFromForm() {
    const prev = await api.settingsGet();
    // Reglas (intervalo, horas, etc.) persisten desde Mi Campaña / defaults; aquí solo email y nombre de campaña
    const rules = { ...(prev.rules || {}) };
    await api.settingsSet({
      rules,
      notifications: { alertEmail: document.getElementById('notif-email').value },
      campaign: { ...(prev.campaign || {}), name: document.getElementById('campaign-name').value },
    });
    logLine(t('log_settings_saved'));
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach((p) => {
        p.classList.toggle('active', p.id === `tab-${tab}`);
      });
    });
  });

  document.getElementById('btn-settings-header').onclick = () => {
    document.querySelector('[data-tab="settings"]').click();
  };

  document.getElementById('btn-welcome-groups').onclick = () => {
    document.querySelector('[data-tab="groups"]').click();
  };
  document.getElementById('btn-welcome-content').onclick = () => {
    document.querySelector('[data-tab="content"]').click();
  };
  document.getElementById('btn-focus-links').onclick = () => {
    document.querySelector('[data-tab="groups"]').click();
    setTimeout(() => {
      const ta = document.getElementById('groups-urls');
      if (ta) ta.focus();
    }, 100);
  };

  document.getElementById('btn-lang').onclick = async () => {
    lang = lang === 'es' ? 'en' : 'es';
    api.settingsSet({ language: lang });
    applyI18n();
    const d = await api.settingsGet();
    renderContentSlots(d.contentSlots || []);
    renderHistory(d.history || []);
    renderGroupsList(d.groups || []);
    await updatePublicationPreview();
    await refreshStats();
    await syncFacebookConnectionUI(d);
  };

  // Activation
  /**
   * Tarjeta "Tu Cuenta de Facebook": lee nombre y cookies del store vía IPC y pinta el estado.
   */
  async function syncFacebookConnectionUI(st) {
    const fbCookies = await api.getStoreValue('fb_session_cookies');
    let fbUserName = await api.getStoreValue('fb_user_name');
    if (typeof fbUserName !== 'string') fbUserName = '';
    fbUserName = fbUserName.trim();

    const hasCookieStore =
      typeof fbCookies === 'string' && fbCookies.length > 10;
    const acc = (st.facebookAccounts || []).find(
      (a) => a.id === (st.activeAccountId || 'default')
    );
    const hasAccountCookies = !!(acc?.cookies && String(acc.cookies).length > 10);
    const connected = hasCookieStore || hasAccountCookies;

    const nombreBasura =
      !fbUserName ||
      fbUserName === 'Iniciar sesión' ||
      fbUserName === 'Log in' ||
      fbUserName === 'Usuario Facebook' ||
      fbUserName === 'Mi cuenta Facebook';

    /** Nombre “real” para mostrar en subtítulo; si no, solo badge ✅ Conectado + texto genérico */
    const tieneNombreUtil =
      connected &&
      !nombreBasura;

    const photo = acc?.photo || '';

    const rowConnect = document.getElementById('fb-connect-row');
    const rowConnected = document.getElementById('fb-connected-row');
    const hint = document.getElementById('fb-disconnected-hint');
    const detailEl = document.getElementById('fb-connected-detail');
    const profileEl = document.getElementById('fb-profile');
    if (!rowConnect || !rowConnected) return;

    if (hint) hint.classList.toggle('hidden', connected);

    if (connected) {
      rowConnect.classList.add('hidden');
      rowConnected.classList.remove('hidden');
      if (detailEl) {
        detailEl.textContent = tieneNombreUtil
          ? t('fb_connected_named').replace('{name}', fbUserName)
          : t('fb_connected_generic');
      }
      const img = document.getElementById('fb-photo');
      if (photo && img) {
        img.src = photo;
        profileEl?.classList.remove('hidden');
      } else {
        if (img) img.removeAttribute('src');
        profileEl?.classList.add('hidden');
      }
    } else {
      rowConnect.classList.remove('hidden');
      rowConnected.classList.add('hidden');
    }
  }

  async function loadDashboard() {
    setView('dashboard');
    const st = await api.settingsGet();
    if (st.language === 'en' || st.language === 'es') {
      lang = st.language;
      applyI18n();
    }
    const h0 = st.history?.[0];
    lastHistoryToastKey = h0 ? `${h0.at}|${h0.groupId}` : '';
    renderGroupsList(st.groups || []);
    renderContentSlots(st.contentSlots || []);
    renderHistory(st.history || []);
    await loadSettingsForm();
    await syncFacebookConnectionUI(st);
    syncCampaignQuickFromStore(st);
    await updatePublicationPreview();
    await refreshStats();
  }

  document.getElementById('btn-activate').onclick = async () => {
    const key = document.getElementById('license-input').value.trim();
    const msg = document.getElementById('activation-msg');
    const btn = document.getElementById('btn-activate');
    msg.textContent = '';
    msg.className = 'msg msg-activation';
    if (!key) {
      msg.classList.add('error');
      msg.textContent =
        lang === 'es'
          ? 'Escribe tu clave de licencia para continuar.'
          : 'Enter your license key to continue.';
      return;
    }
    btn.classList.add('is-loading');
    btn.disabled = true;
    let res;
    try {
      res = await api.activate(key);
    } catch (e) {
      res = { ok: false, reason: 'network_error', message: e.message };
    } finally {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
    if (res.ok) {
      msg.classList.add('ok');
      msg.textContent = t('log_activation_ok');
      logLine(t('log_activation_ok'));
      setTimeout(() => loadDashboard(), 450);
    } else {
      msg.classList.add('error');
      if (res.reason === 'network_error') msg.textContent = t('err_network');
      else if (res.reason === 'wrong_hardware') msg.textContent = t('err_hw');
      else if (res.reason === 'invalid_key') msg.textContent = t('err_invalid_key');
      else if (res.reason === 'inactive_license') msg.textContent = t('err_inactive_license');
      else msg.textContent = t('err_invalid');
    }
  };

  /** Inicia el scheduler o reanuda si estaba en pausa. */
  async function handleBotStartOrResume() {
    const st = await api.botState();
    if (st.restrictionActive) {
      showToastWarning(
        lang === 'es'
          ? 'Facebook limitó la actividad. Espera a que termine la pausa de 24 h.'
          : 'Facebook limited activity. Wait for the 24h cooldown to end.'
      );
      return;
    }
    if (!st.paused && !st.running) {
      const data = await api.settingsGet();
      if (!canStartCampaign(data)) return;
    }
    if (st.paused) {
      const res = await api.botResume();
      if (res && res.ok === false && res.error) {
        showToastWarning(res.error);
        void refreshStats();
        return;
      }
      setBotStatus('running');
      logLine(t('log_bot_resumed'));
    } else {
      const res = await api.botStart();
      if (res && res.ok === false && res.error) {
        showToastWarning(res.error);
        void refreshStats();
        return;
      }
      setBotStatus('running');
      logLine(t('log_bot_started'));
    }
    refreshStats();
  }

  document.getElementById('btn-bot-start').onclick = () => void handleBotStartOrResume();
  const btnResume = document.getElementById('btn-bot-resume');
  if (btnResume) btnResume.onclick = () => void handleBotStartOrResume();

  document.getElementById('btn-bot-pause').onclick = async () => {
    await api.botPause();
    setBotStatus('paused');
    logLine(t('log_bot_paused'));
    refreshStats();
  };
  document.getElementById('btn-bot-stop').onclick = async () => {
    await api.botStop();
    setBotStatus('stopped');
    logLine(t('log_bot_stopped'));
    refreshStats();
  };

  // Grupos
  document.getElementById('btn-extract-ids').onclick = async () => {
    const text = document.getElementById('groups-urls').value;
    const res = await api.groupsExtractIds(text);
    renderGroupsList(await api.groupsList());
    logLine(t('log_groups_added'));
  };
  document.getElementById('btn-import-txt').onclick = async () => {
    const list = await api.groupsImportTxt();
    if (list) renderGroupsList(list);
  };
  document.getElementById('btn-export-txt').onclick = async () => {
    await api.groupsExportTxt();
  };

  const modal = document.getElementById('modal-search');
  document.getElementById('btn-search-groups').onclick = () => {
    modal.classList.remove('hidden');
    const st = document.getElementById('modal-search-status');
    if (st) st.textContent = '';
    const prog = document.getElementById('searchProgress');
    const progBar = document.getElementById('searchProgressBar');
    if (prog) prog.style.display = 'none';
    if (progBar) progBar.style.width = '0%';
    renderSearchModalResults();
  };
  document.getElementById('modal-search-close').onclick = () => modal.classList.add('hidden');
  document.querySelector('#modal-search .modal-backdrop').onclick = () => modal.classList.add('hidden');
  document.getElementById('modal-search-run').onclick = async () => {
    const q = document.getElementById('modal-search-input').value.trim();
    if (!q) return;
    if (isSearching) return;

    const btn = document.getElementById('modal-search-run');
    const input = document.getElementById('modal-search-input');
    const label = document.getElementById('modal-search-run-label');
    const status = document.getElementById('modal-search-status');
    const progress = document.getElementById('searchProgress');
    const progressBar = document.getElementById('searchProgressBar');
    const progressText = document.getElementById('searchProgressText');

    isSearching = true;
    modalSearchLastOk = false;
    lastGroupSearchResults = [];
    renderSearchModalResults();
    btn.disabled = true;
    input.disabled = true;
    btn.classList.add('btn-searching');
    if (label) label.textContent = t('btn_searching');
    if (status) status.textContent = t('modal_search_status_loading');
    if (progress) progress.style.display = 'block';
    if (progressBar) progressBar.style.width = '0%';

    const progressKeys = [
      'progress_msg_0',
      'progress_msg_5',
      'progress_msg_10',
      'progress_msg_15',
    ];
    if (progressText) progressText.textContent = t(progressKeys[0]);

    // Barra simulada: hasta 90% en ~20 s (cada 1 s +4.5%)
    let pct = 0;
    modalSearchTimers.progress = setInterval(() => {
      pct += 4.5;
      if (pct > 90) pct = 90;
      if (progressBar) progressBar.style.width = `${pct}%`;
    }, 1000);

    // Mensajes cada 5 s
    let step = 0;
    modalSearchTimers.messages = setInterval(() => {
      step += 1;
      if (step < progressKeys.length && progressText) {
        progressText.textContent = t(progressKeys[step]);
      }
    }, 5000);

    let searchOk = true;
    try {
      lastGroupSearchResults = (await api.groupsSearch(q)) || [];
      modalSearchLastOk = true;
      clearModalSearchTimers();
      if (progressBar) progressBar.style.width = '100%';
      if (status) status.textContent = t('modal_search_status_done');
      renderSearchModalResults();
    } catch (e) {
      searchOk = false;
      modalSearchLastOk = false;
      lastGroupSearchResults = [];
      clearModalSearchTimers();
      if (status) status.textContent = t('modal_search_status_error');
      if (progressBar) progressBar.style.width = '0%';
      renderSearchModalResults();
    } finally {
      isSearching = false;
      btn.disabled = false;
      input.disabled = false;
      btn.classList.remove('btn-searching');
      if (label) label.textContent = t('btn_search');
      setTimeout(() => {
        if (progress) progress.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
      }, searchOk ? 900 : 500);
    }
  };
  document.getElementById('modal-search-add-selected').onclick = async () => {
    const box = document.getElementById('modal-search-results');
    const addBtn = document.getElementById('modal-search-add-selected');
    const checked = box.querySelectorAll('.modal-search-cb:checked');
    const selected = [];
    checked.forEach((cb) => {
      const id = cb.getAttribute('data-id');
      const g = lastGroupSearchResults.find((x) => String(x.id) === String(id));
      if (g && g.isMember && g.groupType === 'compatible') {
        selected.push({
          id: g.id,
          name: g.name,
          ...(g.members ? { members: g.members } : {}),
        });
      }
    });
    if (!selected.length) {
      showToastWarning(t('toast_select_groups_first'));
      return;
    }

    if (addBtn) addBtn.disabled = true;
    try {
      let verified;
      try {
        verified = await api.groupsVerifyMarketplace(
          selected.map(({ id, name }) => ({ id, name }))
        );
      } catch (e) {
        showToastWarning(t('toast_verify_marketplace_failed'));
        return;
      }

      const toAdd = [];
      let skippedMp = 0;
      for (const v of verified) {
        if (v.groupType === 'marketplace') {
          skippedMp += 1;
          continue;
        }
        const src = selected.find((s) => String(s.id) === String(v.id));
        toAdd.push({
          id: v.id,
          name: v.name || src?.name || `Grupo ${v.id}`,
          status: 'active',
          membership: 'member',
          ...(src?.members ? { members: src.members } : {}),
        });
      }

      if (skippedMp > 0) {
        showToastWarning(t('toast_marketplace_skipped').replace('{n}', String(skippedMp)));
      }
      if (!toAdd.length) {
        return;
      }

      const cur = await api.groupsList();
      const merged = [...cur];
      for (const item of toAdd) {
        const i = merged.findIndex((x) => String(x.id) === String(item.id));
        if (i === -1) merged.push(item);
        else {
          merged[i] = {
            ...merged[i],
            name: item.name || merged[i].name,
            membership: 'member',
          };
        }
      }
      await api.groupsSave(merged.slice(0, 80));
      renderGroupsList(await api.groupsList());
      showToastGroupsAdded(toAdd.length);
      const modalEl = document.getElementById('modal-search');
      setTimeout(() => {
        if (modalEl) modalEl.classList.add('hidden');
      }, 1500);
    } finally {
      if (addBtn) addBtn.disabled = false;
    }
  };

  // Historial — chips de período y resultado (solo presentación)
  document.getElementById('btn-export-csv').onclick = () => api.historyExportCsv();
  const tabHistory = document.getElementById('tab-history');
  if (tabHistory) {
    tabHistory.addEventListener('click', (e) => {
      const pb = e.target.closest('.hist-period-btn');
      if (pb) {
        document
          .querySelectorAll('.hist-period-btn')
          .forEach((b) => b.classList.toggle('active', b === pb));
        refreshHistoryView();
        return;
      }
      const rb = e.target.closest('.hist-result-btn');
      if (rb) {
        document
          .querySelectorAll('.hist-result-btn')
          .forEach((b) => b.classList.toggle('active', b === rb));
        refreshHistoryView();
      }
    });
  }

  // Facebook + settings
  document.getElementById('btn-fb-connect').onclick = async () => {
    const res = await api.facebookConnect();
    if (res.success) {
      await syncFacebookConnectionUI(await api.settingsGet());
      logLine(t('log_fb_connected'));
    } else {
      logLine(
        lang === 'es'
          ? 'No se pudo conectar. Cierra e intenta de nuevo, o revisa tu internet.'
          : 'Could not connect. Try again or check your connection.'
      );
    }
  };

  document.getElementById('btn-fb-disconnect').onclick = async () => {
    await api.facebookDisconnect();
    await syncFacebookConnectionUI(await api.settingsGet());
    logLine(t('log_fb_disconnected'));
  };

  /** Vuelve a abrir el login visible para refrescar cookies y el nombre en el store */
  /** Refresca solo el nombre en disco usando cookies existentes (Chromium headless en main). */
  document.getElementById('btn-fb-refresh-name').onclick = async () => {
    try {
      const result = await api.facebookRefreshName();
      if (result?.ok && result?.name) {
        await syncFacebookConnectionUI(await api.settingsGet());
        logLine(t('log_fb_name_updated'));
      } else {
        logLine(
          lang === 'es'
            ? 'No se pudo leer el nombre. ¿Sigues con sesión? Prueba conectar de nuevo.'
            : 'Could not read your name. Try connecting again if the session expired.'
        );
      }
    } catch (e) {
      console.error('Error actualizando nombre:', e);
      logLine(
        lang === 'es'
          ? 'Error al actualizar el nombre.'
          : 'Error updating display name.'
      );
    }
  };
  document.getElementById('btn-save-settings').onclick = () => saveRulesFromForm();

  // Update banner
  document.getElementById('update-banner-link').onclick = async () => {
    const chk = await api.licenseCheck();
    if (chk.update_price_url) await api.openExternal(chk.update_price_url);
  };

  api.onBotTick(() => refreshStats());
  api.onBotStatus((data) => {
    if (data.status) setBotStatus(data.status);
    updateCampaignWelcomeCard();
  });

  api.onBotProgress((data) => {
    if (data.status === 'restriction_detected') {
      void (async () => {
        const st = await api.botState();
        updateRestrictionBanner(st);
        updateCampaignChecklist(await api.settingsGet(), st);
        syncCampaignPanels(st);
      })();
      return;
    }
    const bar = document.getElementById('campaign-round-progress-bar');
    const detail = document.getElementById('campaign-active-detail');
    if (data.totalGroups > 0 && bar) {
      const pct = Math.min(100, (data.groupIndex / data.totalGroups) * 100);
      bar.style.width = `${data.status === 'waiting' ? 100 : pct}%`;
    }
    if (detail && data.status === 'posting') {
      detail.textContent = t('cap_in_group')
        .replace('{name}', String(data.groupName || ''))
        .replace('{i}', String(data.groupIndex))
        .replace('{n}', String(data.totalGroups));
    }
    if (data.status !== 'posting') {
      appendCampaignProgressLog(data);
    }
    if (
      data.status === 'success' ||
      data.status === 'waiting' ||
      (data.status === 'skipped' && data.skipDetail === 'marketplace')
    ) {
      void refreshStats();
    }
  });

  /** Chips de intervalo / grupos y hora fin (sesión). */
  (function initCampaignQuickControls() {
    document.querySelectorAll('.pick-chip[data-cq="interval"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pick-chip[data-cq="interval"]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        void saveCampaignSession({ intervalHours: Number(btn.getAttribute('data-value')) });
      });
    });
    document.querySelectorAll('.pick-chip[data-cq="groups"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pick-chip[data-cq="groups"]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        void saveCampaignSession({ maxGroupsPerRound: Number(btn.getAttribute('data-value')) });
      });
    });
    const te = document.getElementById('cq-hour-end');
    if (te) {
      te.addEventListener('change', () => void saveCampaignSession({ hourEnd: te.value }));
    }
  })();

  setInterval(refreshStats, 1000);

  // Arranque
  (async function init() {
    const navLang = navigator.language.startsWith('en') ? 'en' : 'es';
    lang = navLang;
    applyI18n();

    const startup = await api.licenseStartupCheck();
    if (startup.check?.update_available) {
      document.getElementById('update-banner').classList.remove('hidden');
      document.getElementById('update-banner-text').textContent = t('update_banner');
    }

    if (startup.showActivation) {
      setView('activation');
    } else {
      await loadDashboard();
    }
  })();
})();
