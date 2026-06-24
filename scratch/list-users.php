<?php
require_once 'C:\\Users\\hp\\Local Sites\\ForgeWP\\app\\public\\wp-load.php';

$users = get_users();
foreach ($users as $user) {
    echo "ID: " . $user->ID . " | Login: " . $user->user_login . " | Email: " . $user->user_email . "\n";
}
