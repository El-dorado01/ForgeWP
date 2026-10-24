import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import { registrationMetaFields } from '../../lib/registration-metadata.js';

const php = buildFunctionsPhp({ name: 'Test', slug: 'test', version: '1', textDomain: 'test', auth: { registrationMetaFields: ['first_name'] } }, { cssFile: 'style.css', jsFile: 'main.js' });
const signup = php.slice(php.indexOf('function forgewp_rest_signup('), php.indexOf('function forgewp_rest_logout('));
const verify = php.slice(php.indexOf('function forgewp_rest_verify_email('), php.indexOf('function forgewp_rest_resend_verification('));
const resend = php.slice(php.indexOf('function forgewp_rest_resend_verification('), php.indexOf('function forgewp_send_email_verification('));

function run(action, input) {
  const data = Buffer.from(JSON.stringify(input)).toString('base64');
  const result = spawnSync('php', ['-r', `
    $input=json_decode(base64_decode('${data}'),true); $created=0; $cookies=0; $meta=array(); $role=null;
    $tokens=isset($input['tokens'])?$input['tokens']:array();
    class WP_Error { public $code; function __construct($code,$message,$data=array()) {$this->code=$code;} }
    class Request {function get_json_params(){global $input;return $input['params'];}}
    class User {public $ID=7; public $user_login='member'; public $user_email='member@example.test'; function set_role($value){global $role;$role=$value;}}
    function get_option($key,$default=''){global $input;return isset($input['options'][$key])?$input['options'][$key]:$default;}
    function sanitize_email($s){return $s;} function sanitize_user($s){return $s;}
    function sanitize_text_field($s){return trim(strip_tags((string)$s));} function sanitize_key($s){return $s;}
    function username_exists($s){return false;} function email_exists($s){return false;}
    function wp_create_user($u,$p,$e){global $created;$created++;return 7;}
    function is_wp_error($value){return $value instanceof WP_Error;}
    function get_user_by($key,$id){return $id===999 ? false : new User;}
    function wp_update_user($value){} function update_user_meta($id,$key,$value){global $meta;$meta[$key]=$value;}
    function forgewp_send_email_verification($user){global $input;return empty($input['mailFail']);} function is_ssl(){return true;}
    function is_email($email){return filter_var($email,FILTER_VALIDATE_EMAIL)!==false;}
    function wp_signon($creds,$ssl){global $input;return !empty($input['failSignon']) ? new WP_Error('denied','Denied') : new User;} function wp_set_current_user($id){global $current_user;$current_user=$id;}
    function wp_set_auth_cookie($id,$remember,$ssl){global $cookies;$cookies++;}
    function forgewp_get_current_user_hydration_payload(){return array('id'=>7);}
    function rest_ensure_response($value){return $value;}
    function get_transient($key){global $tokens;return isset($tokens[$key])?$tokens[$key]:false;}
    function delete_transient($key){global $tokens;unset($tokens[$key]);}
    function get_user_meta($id,$key,$single){global $input;return isset($input['verified'])?$input['verified']:'1';}
    ${signup}
    ${verify}
    ${resend}
    $results=array(); for($i=0;$i<(isset($input['repeat'])?$input['repeat']:1);$i++){$results[]=${action === 'signup' ? 'forgewp_rest_signup' : action === 'resend' ? 'forgewp_rest_resend_verification' : 'forgewp_rest_verify_email'}(new Request);}
    echo json_encode(array('results'=>$results,'created'=>$created,'cookies'=>$cookies,'meta'=>$meta,'role'=>$role,'currentUser'=>isset($current_user)?$current_user:null));
  `], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

it('rejects missing, expired, mismatched and consumed verification tokens even for verified accounts', () => {
  for (const [userId, tokens] of [[7, {}], [7, { forgewp_verify_email_token: 8 }], [999, { forgewp_verify_email_token: 999 }]]) {
    const result = run('verify', { params: { userId, token: 'token' }, tokens });
    expect(result.cookies).toBe(0);
    expect(result.results[0].code).toBe('rest_invalid_token');
  }
  const result = run('verify', { params: { userId: 7, token: 'token' }, tokens: { forgewp_verify_email_token: 7 }, repeat: 2 });
  expect(result.cookies).toBe(1);
  expect(result.results[0].success).toBe(true);
  expect(result.results[1].code).toBe('rest_invalid_token');
});

it('rejects unapproved and non-scalar signup metadata before creating an account', () => {
  for (const metadata of [{ wp_capabilities: 'administrator' }, { session_tokens: 'x' }, { forgewp_email_verified: '1' }, { first_name: ['x'] }, 'not an object']) {
    const result = run('signup', { params: { username: 'member', email: 'member@example.test', password: 'password', metadata } });
    expect(result.created).toBe(0);
    expect(result.results[0].code).toBe('rest_invalid_metadata');
  }
});

it('writes sanitized approved profile metadata and keeps role assignment server-owned', () => {
  const result = run('signup', { params: { username: 'member', email: 'member@example.test', password: 'password', role: 'administrator', metadata: { first_name: '<b>Alex</b>' } } });
  expect(result.role).toBe('subscriber');
  expect(result.meta.first_name).toBe('Alex');
  expect(result.created).toBe(1);
});

it('returns explicit verification status for successful signup without auto-login', () => {
  for (const verification of ['0', '1']) {
    const result = run('signup', { params: { username: 'member', email: 'member@example.test', password: 'password' }, options: { forgewp_auth_auto_login_after_signup: '0', forgewp_auth_email_verification_enabled: verification } });
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].requiresVerification).toBe(verification === '1');
    expect(result.results[0].user).toBeUndefined();
  }
});

it('keeps account creation successful when auto-login fails without claiming a session', () => {
  const result = run('signup', { params: { username: 'member', email: 'member@example.test', password: 'password' }, failSignon: true });
  expect(result.created).toBe(1);
  expect(result.results[0].success).toBe(true);
  expect(result.results[0].user).toBeUndefined();
  expect(result.results[0].message).toContain('Please sign in');
  expect(result.currentUser).toBeNull();
});

it('rejects unsafe developer metadata configuration and defaults to no public keys', () => {
  expect(registrationMetaFields()).toEqual([]);
  for (const fields of [['wp_capabilities'], ['blog_user_level'], ['session_tokens'], ['forgewp_email_verified'], ['first_name', 'first_name'], ['bad-key'], 'name']) {
    expect(() => registrationMetaFields({ registrationMetaFields: fields })).toThrow('registrationMetaFields');
  }
});

it('separates account creation from verification-mail transport failure', () => {
  const result = run('signup', { params: { username: 'member', email: 'member@example.test', password: 'password' }, options: { forgewp_auth_email_verification_enabled: '1' }, mailFail: true });
  expect(result.created).toBe(1);
  expect(result.results[0].success).toBe(true);
  expect(result.results[0].requiresVerification).toBe(true);
  expect(result.results[0].verificationEmailSent).toBe(false);
  expect(result.results[0].message).toContain('could not be sent');
  expect(result.currentUser).toBeNull();
});

it('reports failed resend delivery and permits a later successful retry', () => {
  const request = { params: { email: 'member@example.test' }, verified: '0' };
  expect(run('resend', { ...request, mailFail: true }).results[0].code).toBe('rest_verification_mail_failed');
  expect(run('resend', request).results[0].success).toBe(true);
});
