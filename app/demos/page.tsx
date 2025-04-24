"use client"

import { useState } from 'react';
import { setDocument, viewDocument } from "../../utils/firebaseHelper.js";

export default function Profile() {
    const [docId, setDocId] = useState('');
    const [value, setValue] = useState('');
    const [collectionId, setCollectionId] = useState('');
    const [documentData, setDocumentData] = useState('');

    const handleSet = async (event: { preventDefault: () => void; }) => {
        event.preventDefault();
        try {
            await setDocument(collectionId, docId, { name: value });
            //console.log("Document successfully written!");
            setDocId('');
            setValue('');
        } catch (e) {
            console.error("Error writing document: ", e);
        }
    };

    const handleView = async (event: { preventDefault: () => void; }) => {
        event.preventDefault();
        try {
            const doc = await viewDocument(collectionId, docId);
            if (doc) {
                setDocumentData(doc.name);
            } else {
                setDocumentData("No such document!");
            }
        } catch (e) {
            console.error("Error fetching document: ", e);
        }
    };

    return (
        <div>
            <input
                type="text"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                placeholder="Enter Collection Name"
            />
            <form onSubmit={handleSet}>
                <input
                    type="text"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    placeholder="Enter Key"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter Value"
                />
                <button type="submit">Add Item</button>
            </form>
            <form onSubmit={handleView}>
                <input
                    type="text"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    placeholder="Enter Key"
                />
                <button type="submit">View Item</button>
            </form>
            {documentData && (
                <div>
                    <h3>Document Data:</h3>
                    <pre>{typeof documentData === "string" ? documentData : JSON.stringify(documentData, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
