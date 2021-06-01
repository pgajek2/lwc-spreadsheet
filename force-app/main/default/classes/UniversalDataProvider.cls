public with sharing class UniversalDataProvider {


    @AuraEnabled
    public static List<sObject> getRecords(String objectName, String fieldSetName) {
        try {
            return Database.query(
                constructQueryUsingObjectNameAndFieldSet(objectName, fieldSetName)
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


    public static String constructQueryUsingObjectNameAndFieldSet(String objectName, String fieldSetName) {
        String query = 'SELECT ';

        for (Schema.FieldSetMember field : getFieldSetFieldsForObject(objectName, fieldSetName)) {
            query += field.getFieldPath() + ', ';
        }
        query += 'Id FROM ' + objectName;

        return query;
    }

    public static List<Schema.FieldSetMember> getFieldSetFieldsForObject(String objectName, String fieldSetName) {

        Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        Schema.DescribeSObjectResult describeSObjectResult = sObjectType.getDescribe();
        Schema.FieldSet fieldSet = describeSObjectResult.FieldSets.getMap().get(fieldSetName);
      
        return fieldSet.getFields(); 
    }  
}
