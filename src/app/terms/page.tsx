
import React from 'react';

export const metadata = {
    title: "Terms of Service | WA-AKG",
    description: "Terms of Service for WA-AKG application.",
};

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl prose prose-slate">
            <h1>Terms of Service</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Agreement to Terms</h2>
            <p>
                By accessing or using WA-AKG ("the Application"), you agree to be bound by these Terms of Service.
                If you disagree with any part of the terms, you may not access the Application.
            </p>

            <h2>2. Use License</h2>
            <p>
                Permission is granted to download and install one copy of the WA-AKG software for personal, non-commercial, or commercial transitory viewing only.
                This is the grant of a license, not a transfer of title.
            </p>
            <p>Under this license, you may not:</p>
            <ul>
                <li>Use the software for any illegal or unauthorized purpose;</li>
                <li>Violate any laws in your jurisdiction (including but not limited to copyright laws);</li>
                <li>Transmit any worms or viruses or any code of a destructive nature.</li>
            </ul>

            <h2>3. Disclaimer</h2>
            <p>
                The materials on WA-AKG are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>

            <h2>4. Limitation of Liability</h2>
            <p>
                In no event shall WA-AKG or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the Application, even if we have been notified orally or in writing of the possibility of such damage.
            </p>

            <h2>5. Governing Law</h2>
            <p>
                These terms and conditions are governed by and construed in accordance with the laws of [Your Country/State] and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </p>

            <h2>6. Changes to Terms</h2>
            <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
            </p>

            <h2>7. Contact Us</h2>
            <p>
                If you have any questions about these Terms, please contact us via the GitHub repository or your designated support channel.
            </p>
        </div>
    );
}
