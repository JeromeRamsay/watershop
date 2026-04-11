<?php

require_once __DIR__ . '/env.php';

loadPublicSiteEnv();

if (isset($_POST['username'])) {

    $name    = $_POST['username'];
    $email   = $_POST['email'];
    $phone   = $_POST['phone'];
    $subject = $_POST['subject'];
    $message = $_POST['message'];

    $user_captcha    = $_POST['captcha_answer'];
    $correct_captcha = $_POST['captcha_correct'];

    if ($user_captcha != $correct_captcha) {
        echo "<script>
            alert('Invalid Captcha!');
            window.history.back();
        </script>";
        exit;
    }

    $to = publicSiteEnv('PUBLIC_SITE_CONTACT_EMAIL');

    if ($to === '') {
        echo "<script>
            alert('Server configuration is missing.');
            window.history.back();
        </script>";
        exit;
    }

    $mail_subject = "New Contact Form Message";

    $mail_message = "
        Name: $name
        Email: $email
        Phone: $phone
        Subject: $subject
        Message: $message
    ";

    $headers = "From: $email";

    if (mail($to, $mail_subject, $mail_message, $headers)) {
        echo "<script>
            alert('Message Sent Successfully!');
            window.location.href='index.php';
        </script>";
    } else {
        echo "<script>
            alert('Mail Sending Failed!');
            window.history.back();
        </script>";
    }

}
?>
