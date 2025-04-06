import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductionGuideDetailsPage = () => {
    const [guideDetails, setGuideDetails] = useState(null);

    useEffect(() => {
        const fetchGuideDetails = async () => {
            try {
                const response = await axios.get('/api/guide-details');
                setGuideDetails(response.data);
            } catch (error) {
                console.error(`Fetch guide details error: ${error}`);
                alert('Failed to fetch guide details.');
            }
        };

        fetchGuideDetails();
    }, []);

    const deleteGuide = async () => {
        try {
            await axios.delete('/api/delete-guide');
            alert('Guide deleted successfully.');
        } catch (error) {
            console.error(`Delete guide error: ${error}`);
            const errorMessage = error.response?.data?.message || 'An error occurred.';
            const requiredPermission = error.response?.data?.requiredPermission;
            const requiredValue = error.response?.data?.requiredValue;
            alert(`${errorMessage} Required permission: ${requiredPermission} (Level ${requiredValue}).`);
        }
    };

    return (
        <div>
            <h1>Production Guide Details</h1>
            {guideDetails ? (
                <div>
                    <p>{guideDetails.description}</p>
                    <button onClick={deleteGuide}>Delete Guide</button>
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default ProductionGuideDetailsPage;