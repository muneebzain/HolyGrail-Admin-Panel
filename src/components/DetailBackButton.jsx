import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const DetailBackButton = () => {
    const navigate = useNavigate();

    const goBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate('/');
    };

    return (
        <button type="button" className="detail-back-button" onClick={goBack}>
            <FiArrowLeft /> Back
        </button>
    );
};

export default DetailBackButton;
