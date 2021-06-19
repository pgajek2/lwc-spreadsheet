public with sharing class BulkUpdateController {
    
    @AuraEnabled
    public static List<sObject> getRecordsList(String objectName, String recordName) {
        String name = '%' + recordName + '%';
        String query = 'SELECT Id, Name FROM ' + objectName +' WHERE Name LIKE :name LIMIT 100';

        return Database.query(query);
    }
}
