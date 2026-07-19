<?php
/**
 * ── H1 De-duplication ──
 * SingleHotelPage/SingleListiclePage templates render their own <h1> for
 * the post title. If an editor also starts the post body with a Heading 1
 * block matching the title, the rendered page ends up with two identical
 * H1s. Rather than relying on every editor to remember not to do this,
 * demote any H1 found inside the post body to H2 — the template's own H1
 * remains the page's single H1.
 */
add_filter('the_content', function ($content) {
    if (!is_singular(array('hotel', 'listicle'))) {
        return $content;
    }
    return preg_replace('/<h1(\s[^>]*)?>(.*?)<\/h1>/is', '<h2$1>$2</h2>', $content);
}, 20);
