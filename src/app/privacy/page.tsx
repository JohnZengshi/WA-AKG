
import React from 'react';

export const metadata = {
    title: "Privacy Policy | WA-AKG",
    description: "Privacy Policy for WA-AKG application.",
};

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl prose prose-slate">
            <h1>Privacy Policy</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Introduction</h2>
            <p>
                Welcome to WA-AKG ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
                This Privacy Policy explains how we collect, use, and share your information when you use our self-hosted WhatsApp Gateway application.
            </p>

            <h2>2. Information We Collect</h2>
            <p>
                Since WA-AKG is a self-hosted solution, most of your data remains on your own server. However, depending on your configuration and usage, we may interact with the following data:
            </p>
            <ul>
                <li><strong>Session Data:</strong> WhatsApp session credentials used to connect your instance.</li>
                <li><strong>Messages:</strong> Content of messages processed by the gateway for auto-replies or broadcasting.</li>
                <li><strong>Contacts:</strong> Phone numbers and names managed within the application.</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>
                We use the information we collect to:
            </p>
            <ul>
                <li>Provide, operate, and maintain the application.</li>
                <li>Process and send messages as configured by you.</li>
                <li>Improve the performance and reliability of the software.</li>
            </ul>

            <h2>4. Data Storage and Security</h2>
            <p>
                As a self-hosted application, your data is primarily stored on your own infrastructure (database and file system).
                You are responsible for securing your server and database. We recommend using strong passwords, SSL/TLS encryption, and regular backups.
            </p>

            <h2>5. Sharing Your Information</h2>
            <p>
                We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties.
                Your data is yours and remains under your control on your self-hosted instance.
            </p>

            <h2>6. Changes to This Policy</h2>
            <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>

            <h2>7. Contact Us</h2>
            <p>
                If you have any questions about this Privacy Policy, please contact us via the GitHub repository or your designated support channel.
            </p>
        </div>
    );
}
