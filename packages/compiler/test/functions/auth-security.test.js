import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { buildFunctionsPhp } from '../../lib/functions/index.js';

const php = buildFunctionsPhp({ name: 'Security', slug: 'security', version: '1', auth: {} }, { cssFile: 'style.css', jsFile: 'main.js' });
const security = php.slice(php.indexOf('function forgewp_auth_register_rest_routes()'), php.indexOf('function forgewp_rest_auth_config()'));
const writes = ['login', 'signup', 'register', 'logout', 'verify-email', 'resend-verification', 'lost-password', 'reset-password'];

it('emits the same REST nonce in the session JSON and global hydration without script injection', () => {
  const hydration = php.slice(php.indexOf('function forgewp_auth_head_hydration()'), php.indexOf("add_action('wp_head', 'forgewp_auth_head_hydration'"));
  const result = spawnSync('php', [], { encoding: 'utf8', input: `<?php
    function forgewp_get_current_user_hydration_payload(){return array('id'=>7,'displayName'=>'</script><script>unsafe</script>');}
    function get_option($key,$default){return $default;}
    function wp_create_nonce($action){if($action!=='wp_rest')throw new Exception('Unexpected nonce action');return 'fixture-rest-nonce';}
    function wp_json_encode($value,$flags=0){return json_encode($value,$flags);}
    ${hydration}
    forgewp_auth_head_hydration();
  ` });
  expect(result.status, result.stderr).toBe(0);
  const data = JSON.parse(result.stdout.match(/id="forgewp-session">\s*([\s\S]*?)\s*<\/script>/)[1]);
  expect(data.restNonce).toBe('fixture-rest-nonce');
  expect(data.user.displayName).toBe('</script><script>unsafe</script>');
  expect(result.stdout).toContain('forgeWpHydration.restNonce = "fixture-rest-nonce"');
  expect(result.stdout).not.toContain('</script><script>unsafe');
});

it('rejects non-text login fields before credential checks or cookie creation', () => {
  const login = php.slice(php.indexOf('function forgewp_rest_login('), php.indexOf('function forgewp_rest_signup('));
  const values = [];
  for (const field of ['credential', 'username', 'email', 'user', 'password', 'user_password'])
    for (const invalid of [[], {}, true, 123, null]) values.push({ credential: 'member', password: 'password', [field]: invalid });
  const input = Buffer.from(JSON.stringify(values)).toString('base64');
  const result = spawnSync('php', ['-r', `
    error_reporting(E_ALL);
    class WP_Error {public $code;function __construct($code,$message,$data=array()){$this->code=$code;}}
    class Request {public $params;function __construct($params){$this->params=$params;}function get_json_params(){return $this->params;}}
    function get_option($key,$default){return $default;}
    ${login}
    $results=array();foreach(json_decode(base64_decode('${input}'),true) as $params){$results[]=forgewp_rest_login(new Request($params))->code;}
    echo json_encode($results);
  `], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe('');
  expect(JSON.parse(result.stdout)).toEqual(values.map(() => 'rest_invalid_fields'));
});

it('enforces verification inside authentication before cookie issuance and removes its scoped filter', () => {
  const login = php.slice(php.indexOf('function forgewp_auth_verified_login('), php.indexOf('function forgewp_rest_signup('));
  const result = spawnSync('php', ['-r', `
    error_reporting(E_ALL);$filters=array();$cookies=0;$current=0;$verified='0';$block='1';$fail=false;
    class WP_User {public $ID=7;public $user_login='member';}
    class WP_Error {public $code;function __construct($code,$message,$data=array()){$this->code=$code;}function get_error_code(){return $this->code;}function get_error_message(){return 'Denied';}}
    class Request {function get_json_params(){return array('credential'=>'member','password'=>'password');}}
    function get_option($key,$default=''){global $block;return $key==='forgewp_auth_email_verification_enabled'?'1':($key==='forgewp_auth_block_login_until_verified'?$block:$default);}
    function get_user_meta($id,$key,$single){global $verified;return $verified;}
    function sanitize_text_field($value){return $value;}function is_email($value){return false;}
    function is_ssl(){return true;}function is_wp_error($user){return $user instanceof WP_Error;}
    function add_filter($hook,$callback,$priority,$args){global $filters;$filters[$hook]=$callback;}
    function remove_filter($hook,$callback,$priority){global $filters;unset($filters[$hook]);}
    // Match core's ordering: authenticate filters run before wp_set_auth_cookie.
    function wp_signon($creds,$ssl){global $filters,$cookies,$fail;$user=$fail?new WP_Error('bad_password','Denied'):new WP_User;
      if(isset($filters['authenticate']))$user=call_user_func($filters['authenticate'],$user);
      if(is_wp_error($user))return $user;$cookies++;return $user;}
    function wp_set_current_user($id){global $current;$current=$id;}
    function forgewp_get_current_user_hydration_payload(){global $current;return array('id'=>$current);}
    function rest_ensure_response($value){return $value;}
    ${login}
    $rejected=forgewp_rest_login(new Request);$before=array('code'=>$rejected->code,'cookies'=>$cookies,'current'=>$current,'filters'=>$filters);
    $verified='1';$success=forgewp_rest_login(new Request);$after=array('result'=>$success,'cookies'=>$cookies,'filters'=>$filters);
    $verified='0';$block='0';$permitted=forgewp_rest_login(new Request);
    $fail=true;$failed=forgewp_rest_login(new Request);
    echo json_encode(array('before'=>$before,'after'=>$after,'permitted'=>$permitted,'failed'=>$failed->code,'cookies'=>$cookies,'filters'=>$filters));
  `], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe('');
  const out = JSON.parse(result.stdout);
  expect(out.before).toEqual({ code: 'rest_unverified_email', cookies: 0, current: 0, filters: [] });
  expect(out.after.result.success).toBe(true);
  expect(out.after.cookies).toBe(1);
  expect(out.permitted.success).toBe(true);
  expect(out.failed).toBe('rest_login_failed');
  expect(out.cookies).toBe(2);
  expect(out.filters).toEqual([]);
});

function dispatch(requests, options = {}) {
  const input = Buffer.from(JSON.stringify({ requests, ...options })).toString('base64');
  const result = spawnSync('php', ['-r', `
    error_reporting(E_ALL);
    $input=json_decode(base64_decode('${input}'),true); $routes=array(); $cache=array(); $invoked=0; $keys=array();
    if(isset($input['frontend'])) define('FORGEWP_FRONTEND_ORIGIN',$input['frontend']);
    class WP_Error { public $code;public $data;function __construct($code,$message,$data=array()){$this->code=$code;$this->data=$data;} }
    class Request {
      public $value; function __construct($value){$this->value=$value;}
      function get_header($key){return isset($this->value['headers'][$key])?$this->value['headers'][$key]:null;}
      function get_route(){return '/forgewp/v1/auth/'.$this->value['action'];}
      function get_json_params(){return array_key_exists('params',$this->value)?$this->value['params']:array();}
    }
    function register_rest_route($ns,$route,$args){global $routes;$routes[$route]=$args;}
    function home_url(){global $input;return isset($input['home'])?$input['home']:'https://wp.test/members';}
    function site_url(){return 'https://wp.test/wp';}
    function wp_parse_url($url){return parse_url($url);}
    function __return_true(){return true;}
    function apply_filters($hook,$rule,$action,$request){global $input;return array_key_exists('rule',$input)?$input['rule']:$rule;}
    function wp_salt($scheme){return 'test-secret';}
    function get_transient($key){global $cache,$input;return isset($cache[$key])?$cache[$key]:(isset($input['seed'])?$input['seed']:false);}
    function set_transient($key,$value,$expiry){global $cache,$keys;$cache[$key]=$value;$keys[]=$key;}
    function is_user_logged_in(){global $current;return !empty($current['loggedIn']);}
    function wp_verify_nonce($nonce,$action){return $nonce==='valid-nonce' && $action==='wp_rest';}
    ${security}
    forgewp_auth_register_rest_routes();
    $results=array();
    foreach($input['requests'] as $current){
      $_SERVER['REMOTE_ADDR']=isset($current['peer'])?$current['peer']:'203.0.113.7';
      $_SERVER['HTTP_HOST']=isset($current['host'])?$current['host']:'attacker-controlled.test';
      $request=new Request($current);$route=$routes['/auth/'.strtolower(rtrim($current['action'],'/'))];
      $result=call_user_func($route['permission_callback'],$request);
      // Emulate REST dispatch: handlers must not run after a permission error.
      if($result===true)$invoked++;
      $results[]=$result instanceof WP_Error?array('code'=>$result->code,'data'=>$result->data):array('allowed'=>$result);
    }
    echo json_encode(array('results'=>$results,'invoked'=>$invoked,'cache'=>$cache,'keys'=>$keys,'routes'=>$routes));
  `], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe('');
  return JSON.parse(result.stdout);
}
const request = (action, overrides = {}) => ({ action, headers: { 'content-type': 'application/json', origin: 'https://wp.test' }, ...overrides });

it('guards all write routes while preserving public config and current-session reads', () => {
  const output = dispatch(writes.map((action) => request(action)));
  for (const action of writes) expect(output.routes['/auth/' + action].permission_callback).toBe('forgewp_auth_write_permission');
  expect(output.routes['/auth/me'].permission_callback).toBe('__return_true');
  expect(output.routes['/auth/config'].permission_callback).toBe('__return_true');
});

it.each(writes)('rejects forged browser origins before dispatching %s', (action) => {
  const values = ['https://evil.test', 'https://wp.test.evil.test', 'https://wp.test@evil.test', 'http://wp.test', 'https://wp.test:444', 'null', 'javascript:alert(1)'];
  const out = dispatch(values.map((origin) => request(action, { headers: { 'content-type': 'application/json', origin, referer: 'https://wp.test/' } })));
  expect(out.invoked).toBe(0);
  expect(out.results.every((result) => result.code === 'rest_auth_origin_denied')).toBe(true);
  expect(out.keys).toHaveLength(0);
});

it('compares scheme, exact host and effective port; trusts configured origins rather than Host', () => {
  const out = dispatch(['https://WP.TEST:443', 'https://wp.test', 'https://frontend.test:8443'].map((origin) => request('login', { headers: { origin, 'content-type': 'application/json; charset=UTF-8' } })), { frontend: 'https://frontend.test:8443/app' });
  expect(out.invoked).toBe(3);
  expect(dispatch([request('login', { headers: { origin: 'https://frontend.test:8443', 'content-type': 'application/json' } })]).invoked).toBe(0);
});

it('uses Referer only when Origin is absent, and rejects unverified cross-site metadata', () => {
  const out = dispatch([
    request('login', { headers: { 'content-type': 'application/json', referer: 'https://wp.test/members/login' } }),
    request('login', { headers: { 'content-type': 'application/json', referer: 'https://evil.test/form' } }),
    request('login', { headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-site' } }),
    request('login', { headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' } }),
    request('login', { headers: { 'content-type': 'application/json' } }),
  ]);
  expect(out.results.map((result) => result.allowed || result.code)).toEqual([true, 'rest_auth_origin_denied', 'rest_auth_origin_denied', 'rest_auth_origin_denied', true]);
});

it('rejects simple/form content types and non-object bodies before dispatch', () => {
  const out = dispatch([null, 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=test', 'application/json-evil'].map((type) => request('login', { headers: { 'content-type': type } })).concat([request('login', { params: 'text' })]));
  expect(out.invoked).toBe(0);
  expect(out.results.slice(0, 5).every((r) => r.code === 'rest_auth_json_required')).toBe(true);
  expect(out.results[5].code).toBe('rest_invalid_fields');
  expect(dispatch([request('login', { headers: { 'content-type': 'application/problem+json' } })]).invoked).toBe(1);
});

it('requires a current user and their REST nonce for cookie logout', () => {
  const out = dispatch([
    request('logout'),
    request('logout', { loggedIn: true }),
    request('logout', { loggedIn: true, headers: { 'content-type': 'application/json', 'x-wp-nonce': 'wrong' } }),
    request('logout', { headers: { 'content-type': 'application/json', 'x-wp-nonce': 'valid-nonce' } }),
    request('logout', { loggedIn: true, headers: { 'content-type': 'application/json', 'x-wp-nonce': 'valid-nonce' } }),
  ]);
  expect(out.results.slice(0, 4).every((r) => r.code === 'rest_auth_nonce_required')).toBe(true);
  expect(out.invoked).toBe(1);
});

it('limits attempts by peer with shared aliases and mail limits; ignores spoofed forwarding headers', () => {
  const out = dispatch(Array.from({ length: 7 }, (_, index) => request(index % 2 ? 'lost-password' : 'resend-verification', { headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${index}` } })));
  expect(out.invoked).toBe(5);
  expect(out.results[5].data.status).toBe(429);
  expect(out.results[5].data.retryAfter).toBeGreaterThan(0);
  expect(new Set(out.keys).size).toBe(1);
  expect(out.keys[0]).toMatch(/^forgewp_auth_rate_[a-f0-9]{64}$/);
  const aliases = dispatch(Array.from({ length: 6 }, (_, index) => request(index % 2 ? 'signup' : 'register')));
  expect(aliases.invoked).toBe(5);
  expect(dispatch(Array.from({ length: 21 }, () => request('login'))).invoked).toBe(20);
  expect(dispatch(Array.from({ length: 21 }, (_, index) => request(index % 2 ? 'LOGIN/' : 'login'))).invoked).toBe(20);
  expect(dispatch([request('LOGOUT/')]).results[0].code).toBe('rest_auth_nonce_required');
});

it('separates peers and actions, expires windows and supports explicit site-owner tuning', () => {
  const requests = [request('login'), request('login', { peer: '203.0.113.8' }), request('signup')];
  expect(dispatch(requests, { rule: { limit: 1, window: 60 } }).invoked).toBe(3);
  expect(dispatch([request('login')], { seed: { count: 20, until: 1 } }).invoked).toBe(1);
  expect(dispatch([request('login'), request('login')], { rule: { limit: 1, window: 60 } }).invoked).toBe(1);
  expect(dispatch(Array.from({ length: 22 }, () => request('login')), { rule: false }).invoked).toBe(22);
  expect(dispatch([request('login')], { rule: { limit: 0, window: 60 } }).results[0].code).toBe('rest_auth_rate_limit_config');
});
