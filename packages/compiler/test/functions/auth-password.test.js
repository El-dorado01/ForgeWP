import { spawnSync } from 'node:child_process';
import { it, expect } from 'vitest';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
const php = buildFunctionsPhp({ name: 'Test', slug: 'test', version: '1', textDomain: 'test', auth: {} }, { cssFile: 'a.css', jsFile: 'a.js' });
const functions = php.slice(php.indexOf('function forgewp_rest_lost_password('), php.indexOf('/**\n * Intercept retrieve password'));
function run(action, params, options = {}) {
  const input = Buffer.from(JSON.stringify({ params, ...options })).toString('base64');
  const result = spawnSync('php', ['-r', `
    $input=json_decode(base64_decode('${input}'),true); $changes=0; $used=false; $checks=0;
    class WP_Error {public $code;function __construct($code,$message,$data=array()){$this->code=$code;}function get_error_message(){return 'Recovery delivery failed';}}
    class Request {function get_json_params(){global $input;return $input['params'];}}
    function sanitize_text_field($s){return trim(strip_tags($s));}
    function is_wp_error($s){return $s instanceof WP_Error;}
    function rest_ensure_response($s){return $s;}
    function retrieve_password($login){global $input;return !empty($input['mailFail']) ? new WP_Error('mail','Failed') : true;}
    function check_password_reset_key($key,$login){global $checks,$used;$checks++;return !$used && $key==='valid-key' && $login==='member' ? (object)array('ID'=>7) : new WP_Error('expired','Expired');}
    function reset_password($user,$password){global $changes,$used;$changes++;$used=true;}
    ${functions}
    $results=array();for($i=0;$i<(isset($input['repeat'])?$input['repeat']:1);$i++)$results[]=${action === 'request' ? 'forgewp_rest_lost_password' : 'forgewp_rest_reset_password'}(new Request);
    echo json_encode(array('results'=>$results,'changes'=>$changes,'checks'=>$checks));
  `], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}
it('validates recovery inputs and surfaces WordPress delivery errors', () => {
  expect(run('request', {}).results[0].code).toBe('rest_missing_fields');
  expect(run('request', { email: [] }).results[0].code).toBe('rest_invalid_fields');
  expect(run('request', { user_login: 'member' }, { mailFail: true }).results[0].code).toBe('rest_recovery_failed');
  expect(run('request', { email: 'member@example.test' }).results[0].success).toBe(true);
});
it('changes passwords only after WordPress validates the account/key pair', () => {
  for (const params of [{}, { login: 'member', key: 'valid-key', password: [] }, { login: 'other', key: 'valid-key', password: 'new' }, { login: 'member', key: 'expired', password: 'new' }]) expect(run('reset', params).changes).toBe(0);
  const result = run('reset', { login: 'member', key: 'valid-key', password: 'new-password' }, { repeat: 2 });
  expect(result.changes).toBe(1);
  expect(result.results[0].success).toBe(true);
  expect(result.results[1].code).toBe('rest_invalid_key');
});
