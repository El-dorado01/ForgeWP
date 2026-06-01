/**
 * Project-specific compiler hooks for Hotelchecker24.
 * This separates project-specific HTML replacements from the generic ForgeWP framework compiler.
 */

function processTemplateMarkup(slug, html, config) {
  const textDomain = config.textDomain || 'hotelchecker24';

  if (slug === 'template-ber-uns-page') {
    // 1. stats replacement
    const statsHtmlPattern = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center"><div class="space-y-1"><div class="text-2xl font-black text-slate-900 tracking-tight">500+</div><div class="text-xs font-semibold text-slate-400"><?php echo __('Hotels bewertet', '${textDomain}'); ?></div></div><div class="space-y-1"><div class="text-2xl font-black text-slate-900 tracking-tight">40</div><div class="text-xs font-semibold text-slate-400"><?php echo __('Länder', '${textDomain}'); ?></div></div><div class="space-y-1"><div class="text-2xl font-black text-slate-900 tracking-tight">80k</div><div class="text-xs font-semibold text-slate-400"><?php echo __('Leser / Monat', '${textDomain}'); ?></div></div><div class="space-y-1"><div class="text-2xl font-black text-slate-900 tracking-tight">6</div><div class="text-xs font-semibold text-slate-400"><?php echo __('Jahre Erfahrung', '${textDomain}'); ?></div></div></div>`;
    
    const statsReplacement = `<?php
$stats_rows = forgewp_get_repeater_field('stats', array('value', 'label'));
if (empty($stats_rows)) {
    $stats_rows = array(
        array('value' => '500+', 'label' => 'Hotels bewertet'),
        array('value' => '40', 'label' => 'Länder'),
        array('value' => '80k', 'label' => 'Leser / Monat'),
        array('value' => '6', 'label' => 'Jahre Erfahrung')
    );
}
echo '<div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">';
foreach ($stats_rows as $row) {
    ?>
    <div class="space-y-1">
      <div class="text-2xl font-black text-slate-900 tracking-tight"><?php echo esc_html($row['value']); ?></div>
      <div class="text-xs font-semibold text-slate-400"><?php echo esc_html(__($row['label'], '${textDomain}')); ?></div>
    </div>
    <?php
}
echo '</div>';
?>`;
    
    html = html.replace(statsHtmlPattern, statsReplacement);

    // 2. values replacement
    const valuesHtmlPattern = `<div class="grid grid-cols-2 gap-4"><div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow"><div class="w-10 h-10 rounded-xl border flex items-center justify-center mb-3 text-primary bg-primary/10 border-primary/20"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award w-5 h-5"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg></div><h3 class="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug"><?php echo __('Unabhängige Bewertung', '${textDomain}'); ?></h3><p class="text-xs sm:text-sm text-slate-500 leading-relaxed"><?php echo __('Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.', '${textDomain}'); ?></p></div><div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow"><div class="w-10 h-10 rounded-xl border flex items-center justify-center mb-3 text-blue-600 bg-blue-50 border-blue-100"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield w-5 h-5"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg></div><h3 class="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug"><?php echo __('Vertrauen & Transparenz', '${textDomain}'); ?></h3><p class="text-xs sm:text-sm text-slate-500 leading-relaxed"><?php echo __('Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.', '${textDomain}'); ?></p></div><div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow"><div class="w-10 h-10 rounded-xl border flex items-center justify-center mb-3 text-[#929f5d] bg-[#929f5d]/10 border-[#929f5d]/20"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe w-5 h-5"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg></div><h3 class="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug"><?php echo __('Globale Reichweite', '${textDomain}'); ?></h3><p class="text-xs sm:text-sm text-slate-500 leading-relaxed"><?php echo __('Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.', '${textDomain}'); ?></p></div><div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow"><div class="w-10 h-10 rounded-xl border flex items-center justify-center mb-3 text-amber-600 bg-amber-50 border-amber-100"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div><h3 class="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug"><?php echo __('Community-First', '${textDomain}'); ?></h3><p class="text-xs sm:text-sm text-slate-500 leading-relaxed"><?php echo __('Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.', '${textDomain}'); ?></p></div></div>`;
    
    const valuesReplacement = `<?php
$values_rows = forgewp_get_repeater_field('values', array('icon', 'title', 'description', 'color'));
if (empty($values_rows)) {
    $values_rows = array(
        array('icon' => 'award', 'title' => 'Unabhängige Bewertung', 'description' => 'Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.', 'color' => 'text-primary bg-primary/10 border-primary/20'),
        array('icon' => 'shield', 'title' => 'Vertrauen & Transparenz', 'description' => 'Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.', 'color' => 'text-blue-600 bg-blue-50 border-blue-100'),
        array('icon' => 'globe', 'title' => 'Globale Reichweite', 'description' => 'Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.', 'color' => 'text-[#929f5d] bg-[#929f5d]/10 border-[#929f5d]/20'),
        array('icon' => 'users', 'title' => 'Community-First', 'description' => 'Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.', 'color' => 'text-amber-600 bg-amber-50 border-amber-100')
    );
}
echo '<div class="grid grid-cols-2 gap-4">';
foreach ($values_rows as $row) {
    $icon_name = isset($row['icon']) ? $row['icon'] : 'award';
    $color_classes = isset($row['color']) ? $row['color'] : 'text-primary bg-primary/10 border-primary/20';
    $svg = '';
    if ($icon_name === 'award') {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award w-5 h-5"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg>';
    } elseif ($icon_name === 'shield') {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield w-5 h-5"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1-1z"></path></svg>';
    } elseif ($icon_name === 'globe') {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe w-5 h-5"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>';
    } elseif ($icon_name === 'users') {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
    } else {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award w-5 h-5"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg>';
    }
    ?>
    <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
      <div class="w-10 h-10 rounded-xl border flex items-center justify-center mb-3 <?php echo esc_attr($color_classes); ?>">
        <?php echo $svg; ?>
      </div>
      <h3 class="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug"><?php echo esc_html(__($row['title'], '${textDomain}')); ?></h3>
      <p class="text-xs sm:text-sm text-slate-500 leading-relaxed"><?php echo esc_html(__($row['description'], '${textDomain}')); ?></p>
    </div>
    <?php
}
echo '</div>';
?>`;
    
    html = html.replace(valuesHtmlPattern, valuesReplacement);

    // 3. team_members replacement
    const teamHtmlPattern = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><div class="bg-slate-50/70 border border-slate-100/90 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white hover:border-primary/20 transition-all duration-300 group relative overflow-hidden flex flex-col items-center"><div class="absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div><div class="w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 border border-slate-200 group-hover:border-primary transition-colors duration-300 shadow-xs relative"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&amp;fit=crop&amp;w=200&amp;q=80" alt="Isabella von Habsburg" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200">Isabella von Habsburg</h3><p class="text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3"><?php echo __('Chefredakteurin', '${textDomain}'); ?></p><p class="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[200px]"><?php echo __('Über 15 Jahre Erfahrung in der Luxushotellerie. Spezialisiert auf alpinen Wellness-Tourismus.', '${textDomain}'); ?></p></div><div class="bg-slate-50/70 border border-slate-100/90 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white hover:border-primary/20 transition-all duration-300 group relative overflow-hidden flex flex-col items-center"><div class="absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div><div class="w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 border border-slate-200 group-hover:border-primary transition-colors duration-300 shadow-xs relative"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&amp;fit=crop&amp;w=200&amp;q=80" alt="Matteo Bianchi" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200">Matteo Bianchi</h3><p class="text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3"><?php echo __('Reiseredakteur', '${textDomain}'); ?></p><p class="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[200px]"><?php echo __('Kenner des mediterranen Raums. Hat über 200 Hotels in Italien, Griechenland und Spanien bewertet.', '${textDomain}'); ?></p></div><div class="bg-slate-50/70 border border-slate-100/90 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white hover:border-primary/20 transition-all duration-300 group relative overflow-hidden flex flex-col items-center"><div class="absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div><div class="w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 border border-slate-200 group-hover:border-primary transition-colors duration-300 shadow-xs relative"><img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&amp;fit=crop&amp;w=200&amp;q=80" alt="Sophie Lehmann" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200">Sophie Lehmann</h3><p class="text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3"><?php echo __('Destinations-Expertin', '${textDomain}'); ?></p><p class="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[200px]"><?php echo __('Spezialistin für City-Hotels und Boutique-Unterkünfte im deutschsprachigen Raum.', '${textDomain}'); ?></p></div><div class="bg-slate-50/70 border border-slate-100/90 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white hover:border-primary/20 transition-all duration-300 group relative overflow-hidden flex flex-col items-center"><div class="absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div><div class="w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 border border-slate-200 group-hover:border-primary transition-colors duration-300 shadow-xs relative"><img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&amp;fit=crop&amp;w=200&amp;q=80" alt="Lars Eriksson" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200">Lars Eriksson</h3><p class="text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3"><?php echo __('Nordeuropa-Korrespondent', '${textDomain}'); ?></p><p class="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[200px]"><?php echo __('Reist für uns durch Skandinavien und berichtet über Design-Hotels und Naturresorts.', '${textDomain}'); ?></p></div></div>`;
    
    const teamReplacement = `<?php
$team_rows = forgewp_get_repeater_field('team_members', array('name', 'role', 'bio', 'avatar'));
if (empty($team_rows)) {
    $team_rows = array(
        array('name' => 'Isabella von Habsburg', 'role' => 'Chefredakteurin', 'bio' => 'Über 15 Jahre Erfahrung in der Luxushotellerie. Spezialisiert auf alpinen Wellness-Tourismus.', 'avatar' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'),
        array('name' => 'Matteo Bianchi', 'role' => 'Reiseredakteur', 'bio' => 'Kenner des mediterranen Raums. Hat über 200 Hotels in Italien, Griechenland und Spanien bewertet.', 'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'),
        array('name' => 'Sophie Lehmann', 'role' => 'Destinations-Expertin', 'bio' => 'Spezialistin für City-Hotels und Boutique-Unterkünfte im deutschsprachigen Raum.', 'avatar' => 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80'),
        array('name' => 'Lars Eriksson', 'role' => 'Nordeuropa-Korrespondent', 'bio' => 'Reist für uns durch Skandinavien und berichtet über Design-Hotels und Naturresorts.', 'avatar' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80')
    );
}
echo '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">';
foreach ($team_rows as $row) {
    $avatar_url = isset($row['avatar']) ? (is_array($row['avatar']) ? (isset($row['avatar']['url']) ? $row['avatar']['url'] : '') : $row['avatar']) : '';
    ?>
    <div class="bg-slate-50/70 border border-slate-100/90 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white hover:border-primary/20 transition-all duration-300 group relative overflow-hidden flex flex-col items-center">
      <div class="absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      <div class="w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 border border-slate-200 group-hover:border-primary transition-colors duration-300 shadow-xs relative">
        <?php if (!empty($avatar_url)) : ?>
            <img src="<?php echo esc_url($avatar_url); ?>" alt="<?php echo esc_attr($row['name']); ?>" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"/>
        <?php endif; ?>
      </div>
      <h3 class="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200"><?php echo esc_html($row['name']); ?></h3>
      <p class="text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3"><?php echo esc_html(__($row['role'], '${textDomain}')); ?></p>
      <p class="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[200px]"><?php echo esc_html(__($row['bio'], '${textDomain}')); ?></p>
    </div>
    <?php
}
echo '</div>';
?>`;

    html = html.replace(teamHtmlPattern, teamReplacement);
  }

  return html;
}

function processFunctionsPhp(php, config) {
  const mailpoetCode = `
/**
 * Custom REST API Endpoint for MailPoet subscriber integration.
 * Enables subscribing users to MailPoet list via POST /wp-json/mailpoet/v1/subscribers
 */
function forgewp_mailpoet_rest_subscribe_init() {
    register_rest_route('mailpoet/v1', '/subscribers', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_mailpoet_rest_subscribe_callback',
        'permission_callback' => '__return_true', // Open endpoint
    ));
}
add_action('rest_api_init', 'forgewp_mailpoet_rest_subscribe_init');

function forgewp_mailpoet_rest_subscribe_callback($request) {
    $params = $request->get_json_params();
    if (empty($params)) {
        $params = $request->get_body_params();
    }
    
    $email = isset($params['email']) ? sanitize_email($params['email']) : '';
    if (empty($email)) {
        return new WP_Error('invalid_email', 'Please provide a valid email address.', array('status' => 400));
    }

    if (!class_exists('\\MailPoet\\API\\API')) {
        // MailPoet is not active, return success in mock mode or error
        return new WP_REST_Response(array('status' => 'mock_success', 'message' => 'MailPoet is not active, simulated success.'), 200);
    }

    try {
        $mailpoet_api = \\MailPoet\\API\\API::MP('v1');
        
        // Find default or first subscription list ID
        $lists = $mailpoet_api->getLists();
        $list_ids = array();
        if (!empty($lists)) {
            $list_ids[] = $lists[0]['id'];
        } else {
            $list_ids[] = 1; // Fallback to list ID 1
        }
        
        $subscriber_data = array('email' => $email);
        
        // Add subscriber (checks duplicate automatically)
        $mailpoet_api->addSubscriber($subscriber_data, $list_ids);
        return new WP_REST_Response(array('status' => 'subscribed', 'email' => $email), 200);
    } catch (\\Exception $e) {
        return new WP_Error('mailpoet_error', $e->getMessage(), array('status' => 400));
    }
}
`;
  return php + mailpoetCode;
}

export {
  processTemplateMarkup,
  processFunctionsPhp
};
