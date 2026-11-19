<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

use InvalidArgumentException;

final class Notification
{
    public const TAGS = ['order_number', 'order_id', 'license_number', 'company', 'license_type', 'license_scope', 'product_name'];

    public static function validateSettings(array $input): array {
        $to = $input['notification_to'] ?? '';
        $subject = $input['notification_subject'] ?? '';
        $body = $input['notification_body'] ?? '';
        if (!is_string($to) || !is_email(trim($to))) throw new InvalidArgumentException('Bitte geben Sie eine gültige Empfänger-E-Mail-Adresse an.');
        if (!is_string($subject) || trim($subject) === '' || mb_strlen($subject) > 200 || preg_match('/[\r\n]/', $subject)) {
            throw new InvalidArgumentException('Der E-Mail-Betreff muss 1–200 Zeichen lang sein und darf keine Zeilenumbrüche enthalten.');
        }
        if (!is_string($body) || trim($body) === '' || mb_strlen($body) > 10000) {
            throw new InvalidArgumentException('Der E-Mail-Text muss 1–10000 Zeichen lang sein.');
        }
        foreach ([$subject, $body] as $template) {
            preg_match_all('/\{([^{}]+)\}/u', $template, $matches);
            foreach ($matches[1] as $tag) {
                if (!in_array($tag, self::TAGS, true)) throw new InvalidArgumentException('Unbekannter E-Mail-Platzhalter: {' . $tag . '}');
            }
        }
        $result = [
            'notification_to' => sanitize_email(trim($to)),
            'notification_subject' => sanitize_text_field($subject),
            'notification_body' => sanitize_textarea_field($body),
        ];
        if ($result['notification_subject'] === '' || $result['notification_body'] === '') throw new InvalidArgumentException('Bitte geben Sie einen Betreff und Nachrichtentext als Klartext an.');
        return $result;
    }

    public static function render(object $row, object $order, array $settings): array {
        $settings = self::validateSettings($settings);
        $snapshot = json_decode($row->snapshot, true, 512, JSON_THROW_ON_ERROR);
        $values = [
            '{order_number}' => (string) $order->get_number(),
            '{order_id}' => (string) $order->id,
            '{license_number}' => $row->number,
            '{company}' => $snapshot['holder'],
            '{license_type}' => $snapshot['type'],
            '{license_scope}' => $snapshot['scope'],
            '{product_name}' => get_the_title((int) $row->product_id),
        ];
        $values = array_map(static fn($value) => sanitize_textarea_field((string) $value), $values);
        // Single-pass replacement: tokens inside buyer-provided text are never evaluated.
        $subject = sanitize_text_field(strtr($settings['notification_subject'], $values));
        if ($row->mode === 'test' && !str_starts_with($subject, '[TEST] ')) $subject = '[TEST] ' . $subject;
        return ['to' => $settings['notification_to'], 'subject' => $subject, 'body' => strtr($settings['notification_body'], $values)];
    }
}
