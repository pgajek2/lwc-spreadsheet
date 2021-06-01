import { LightningElement, api } from 'lwc';

import getRecords from '@salesforce/apex/UniversalDataProvider.getRecords';
import getColumns from '@salesforce/apex/UniversalDataProvider.getColumns';

export default class FieldsetDatatable extends LightningElement {

    @api objectName;
    @api fieldSetName;

    columns = [];
    data = [];

    async connectedCallback() {
        console.log(this.objectName)
        console.log(this.fieldSetName)
        await this.getColumnsForObject();
        this.getRecordsForObject();
    }

    async getRecordsForObject() {
        await getRecords({
            objectName: this.objectName,
            fieldSetName: this.fieldSetName
        }).then(result => {
            this.data = result;
            console.log(this.data)
        }).catch(error => {
            console.error(error);
        });
    }

    getColumnsForObject() {
        getColumns({
            objectName: this.objectName,
            fieldSetName: this.fieldSetName
        }).then(result => {
            this.columns = result;
            console.log(this.columns)
        }).catch(error => {
            console.error(error);
        });
    }
}