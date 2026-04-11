<?php

require_once __DIR__ . '/env.php';

loadPublicSiteEnv();

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $secretKey = publicSiteEnv('PUBLIC_SITE_RECAPTCHA_SECRET');
    $to = publicSiteEnv('PUBLIC_SITE_CONTACT_EMAIL');

    if ($secretKey === '' || $to === '') {
        http_response_code(500);
        echo "Server configuration is missing.";
        exit;
    }

    $recaptchaResponse = $_POST['g-recaptcha-response'];

    // Verify reCAPTCHA
    $verify = file_get_contents(
        "https://www.google.com/recaptcha/api/siteverify?secret=".$secretKey."&response=".$recaptchaResponse
    );

    $responseData = json_decode($verify);

    if (!$responseData->success) {
        echo "Please verify that you are not a robot.";
        exit;
    }

    // Sanitize inputs
    $name = htmlspecialchars($_POST['username']);
    $email = htmlspecialchars($_POST['email']);
    $phone = htmlspecialchars($_POST['phone']);
    $subject = htmlspecialchars($_POST['subject']);
    $message = htmlspecialchars($_POST['message']);

    if (empty($name) || empty($email) || empty($phone)) {
        echo "All fields are required.";
        exit;
    }

    $mailSubject = "New Contact Form Message";

    $body = "

        <table border='1' cellpadding='10' cellspacing='0' width='600'>

        <tr>
        <td><b>Name</b></td>
        <td>$name</td>
        </tr>

        <tr>
        <td><b>Email</b></td>
        <td>$email</td>
        </tr>

        <tr>
        <td><b>Phone</b></td>
        <td>$phone</td>
        </tr>

        <tr>
        <td><b>Subject</b></td>
        <td>$subject</td>
        </tr>

        <tr>
        <td><b>Message</b></td>
        <td>$message</td>
        </tr>

        </table>

    ";

        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: $email";

    if (mail($to, $mailSubject, $body, $headers)) {
        echo "success";
    } else {
        echo "Mail sending failed!";
    }
}
?>
