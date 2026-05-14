import React from 'react';

const Contacts = () => {
    return (
        <div className='contacts-section'>
            <div className='settings-card'>
                <h3>Support Contacts</h3>
                <p>If you encounter any issues or have questions, please reach out to our support team.</p>

                <div style={{ marginTop: '2rem' }}>
                    <h4>Email Support</h4>
                    <p>support@dtool.com</p>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <h4>Telegram Community</h4>
                    <p>@dtool_community</p>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <h4>Developer</h4>
                    <p>contact@developer.com</p>
                </div>
            </div>

            <div className='settings-card'>
                <h3>Business Hours</h3>
                <p>Monday - Friday: 9:00 AM - 5:00 PM (UTC)</p>
                <p>Saturday: 10:00 AM - 2:00 PM (UTC)</p>
                <p>Sunday: Closed</p>
            </div>
        </div>
    );
};

export default Contacts;
