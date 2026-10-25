import React, { useEffect } from 'react';
import Table from './components/Table';
import { useGet } from '../hooks/Api';
import { backendApiBaseUrl } from '../constants';

interface Props {

}

const UsefulInfoPage: React.FC<Props> = ({ }) => {
    const { data, loading } = useGet(`/api/statements/files`);
    const filenames = (data as { results?: any[] } | undefined)?.results ?? [];

    useEffect(() => {
        if (data) {
            console.info('Error fetching filenames:', data, filenames);
        }
    }, [loading]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Table headers={['Filename']} data={filenames} />
            <div className="useful-info">
                <h2>Useful Information</h2>
                <p>This page provides a sample table to demonstrate the structure of the data that can be uploaded and processed. The table includes transaction details such as dates, descriptions, categories, and amounts.</p>
                <p>Use this information to understand how to format your CSV files for successful uploads.</p>
            </div>
        </div>
    );
};

export default UsefulInfoPage;