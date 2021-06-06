public with sharing class UniversalDataProvider {


    @AuraEnabled
    public static List<sObject> getRecords(String parentId, String parentFiledApi, String objectName, String fieldSetName) {
        try {
            return Database.query(
                constructQueryUsingObjectNameAndFieldSet(parentId, parentFiledApi, objectName, fieldSetName)
            );
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<UniversalDataWrapper.Column> getColumns(String objectName, String fieldSetName) {
        try {
            List<UniversalDataWrapper.Column> response = new List<UniversalDataWrapper.Column>();
            for (Schema.FieldSetMember field : getFieldSetFieldsForObject(objectName, fieldSetName)) {
                response.add(
                    new UniversalDataWrapper.Column(
                        field.getLabel(),
                        field.getFieldPath(),
                        String.valueOf(field.getType())
                    )
                );
            }
            return response;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void saveRecords(List<sObject> records){
        try {
            update records;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    public static String constructQueryUsingObjectNameAndFieldSet(String parentId, String parentFiledApi, String objectName, String fieldSetName) {
        String query = 'SELECT ';

        for (Schema.FieldSetMember field : getFieldSetFieldsForObject(objectName, fieldSetName)) {
            query += field.getFieldPath() + ', ';
        }
        query += 'Id FROM ' + objectName;
        query += ' WHERE ' + parentFiledApi + ' = :parentId';

        return query;
    }

    public static List<Schema.FieldSetMember> getFieldSetFieldsForObject(String objectName, String fieldSetName) {

        Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        Schema.DescribeSObjectResult describeSObjectResult = sObjectType.getDescribe();
        Schema.FieldSet fieldSet = describeSObjectResult.FieldSets.getMap().get(fieldSetName);
      
        return fieldSet.getFields(); 
    }  
}